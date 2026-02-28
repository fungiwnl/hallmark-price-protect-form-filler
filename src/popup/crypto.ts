import { scryptAsync } from "@noble/hashes/scrypt.js";

import type { PersonalProfile } from "../shared/profile";

export const CRYPTO_VERSION = 3;

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 131072,
  r: 8,
  p: 2,
  dkLen: 32
};

export interface EncryptedProfileRecord {
  version: number;
  kdf: "scrypt";
  scrypt: ScryptParams;
  iv: string;
  salt: string;
  payload: string;
  savedAt: string;
}

export interface CryptoOptions {
  crypto?: Crypto;
  now?: () => Date;
  scryptParams?: Partial<ScryptParams>;
}

export async function encryptProfile(
  profile: PersonalProfile,
  passphrase: string,
  options: CryptoOptions = {}
): Promise<EncryptedProfileRecord> {
  const cryptoApi = resolveCrypto(options.crypto);
  const scryptParams = {
    ...DEFAULT_SCRYPT_PARAMS,
    ...options.scryptParams
  };
  validateScryptParams(scryptParams);

  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(passphrase, salt, ["encrypt"], scryptParams, cryptoApi);
  const encoded = new TextEncoder().encode(JSON.stringify(profile));
  const aad = buildAad(CRYPTO_VERSION, scryptParams);

  const cipherBuffer = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
    key,
    toArrayBuffer(encoded)
  );

  return {
    version: CRYPTO_VERSION,
    kdf: "scrypt",
    scrypt: scryptParams,
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    payload: bytesToBase64(new Uint8Array(cipherBuffer)),
    savedAt: (options.now ?? (() => new Date()))().toISOString()
  };
}

export async function decryptProfile(
  record: EncryptedProfileRecord,
  passphrase: string,
  options: CryptoOptions = {}
): Promise<PersonalProfile> {
  if (!record?.iv || !record.salt || !record.payload || record.kdf !== "scrypt" || !record.scrypt) {
    throw new Error("Invalid saved profile format.");
  }
  if (record.version !== CRYPTO_VERSION) {
    throw new Error("Unsupported encryption version. Re-save your profile with this extension.");
  }

  const cryptoApi = resolveCrypto(options.crypto);
  validateScryptParams(record.scrypt);

  const iv = base64ToBytes(record.iv);
  const salt = base64ToBytes(record.salt);
  const payload = base64ToBytes(record.payload);
  const key = await deriveAesKey(passphrase, salt, ["decrypt"], record.scrypt, cryptoApi);
  const aad = buildAad(record.version, record.scrypt);

  const plainBuffer = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
    key,
    toArrayBuffer(payload)
  );
  const plainText = new TextDecoder().decode(plainBuffer);
  return JSON.parse(plainText) as PersonalProfile;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  keyUsages: KeyUsage[],
  scryptParams: ScryptParams,
  cryptoApi: Crypto
): Promise<CryptoKey> {
  const passphraseBytes = new TextEncoder().encode(passphrase);
  const keyBytes = await scryptAsync(passphraseBytes, salt, {
    ...scryptParams,
    asyncTick: 10
  });

  return cryptoApi.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    keyUsages
  );
}

function resolveCrypto(cryptoImpl?: Crypto): Crypto {
  const resolved = cryptoImpl ?? globalThis.crypto;
  if (!resolved?.subtle) {
    throw new Error("Web Crypto API is unavailable in this environment.");
  }
  return resolved;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  const BufferImpl = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(bytes).toString("base64");
  }

  throw new Error("No base64 encoder available.");
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const BufferImpl = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
  if (BufferImpl) {
    return new Uint8Array(BufferImpl.from(base64, "base64"));
  }

  throw new Error("No base64 decoder available.");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function buildAad(version: number, scrypt: ScryptParams): Uint8Array {
  return new TextEncoder().encode(
    `${version}|scrypt|${scrypt.N}|${scrypt.r}|${scrypt.p}|${scrypt.dkLen}`
  );
}

function validateScryptParams(params: ScryptParams): void {
  const isPositiveInteger = (value: number): boolean =>
    Number.isInteger(value) && Number.isFinite(value) && value > 0;
  const isPowerOfTwo = (value: number): boolean => (value & (value - 1)) === 0;

  if (
    !isPositiveInteger(params.N) ||
    !isPowerOfTwo(params.N) ||
    params.N < 1024 ||
    params.N > 1_048_576 ||
    !isPositiveInteger(params.r) ||
    params.r > 32 ||
    !isPositiveInteger(params.p) ||
    params.p > 16 ||
    !isPositiveInteger(params.dkLen) ||
    params.dkLen < 16 ||
    params.dkLen > 64
  ) {
    throw new Error("Invalid saved profile format.");
  }
}
