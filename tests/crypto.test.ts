import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  DEFAULT_SCRYPT_PARAMS,
  decryptProfile,
  encryptProfile,
  type EncryptedProfileRecord
} from "../src/popup/crypto";

const testCrypto = webcrypto as unknown as Crypto;

describe("popup crypto", () => {
  it("uses hardened default scrypt parameters", () => {
    expect(DEFAULT_SCRYPT_PARAMS).toMatchObject({
      N: 131072,
      r: 8,
      p: 2,
      dkLen: 32
    });
  });

  it("round-trips byte arrays through base64 helpers", () => {
    const input = new Uint8Array([1, 2, 3, 4, 255]);
    const encoded = bytesToBase64(input);
    const output = base64ToBytes(encoded);

    expect(Array.from(output)).toEqual(Array.from(input));
  });

  it("encrypts and decrypts a profile with scrypt", async () => {
    const profile = {
      firstName: "Ada",
      surname: "Lovelace",
      email: "ada@example.com"
    };

    const encrypted = await encryptProfile(profile, "very-secure-passphrase", {
      crypto: testCrypto,
      scryptParams: {
        N: 1024,
        r: 8,
        p: 1,
        dkLen: 32
      },
      now: () => new Date("2026-02-28T00:00:00.000Z")
    });

    expect(encrypted.version).toBe(3);
    expect(encrypted.kdf).toBe("scrypt");
    expect(encrypted.savedAt).toBe("2026-02-28T00:00:00.000Z");

    const decrypted = await decryptProfile(encrypted, "very-secure-passphrase", {
      crypto: testCrypto
    });

    expect(decrypted).toEqual(profile);
  });

  it("throws when passphrase is incorrect", async () => {
    const encrypted: EncryptedProfileRecord = await encryptProfile(
      { firstName: "Ada" },
      "correct-passphrase",
      {
        crypto: testCrypto,
        scryptParams: {
          N: 1024,
          r: 8,
          p: 1,
          dkLen: 32
        }
      }
    );

    await expect(
      decryptProfile(encrypted, "wrong-passphrase", {
        crypto: testCrypto
      })
    ).rejects.toThrow();
  });

  it("throws on invalid kdf metadata", async () => {
    const encrypted = await encryptProfile(
      { firstName: "Ada" },
      "correct-passphrase",
      {
        crypto: testCrypto,
        scryptParams: {
          N: 1024,
          r: 8,
          p: 1,
          dkLen: 32
        }
      }
    );

    const invalidRecord = {
      ...encrypted,
      kdf: "pbkdf2"
    } as unknown as EncryptedProfileRecord;

    await expect(
      decryptProfile(invalidRecord, "correct-passphrase", {
        crypto: testCrypto
      })
    ).rejects.toThrow("Invalid saved profile format.");
  });

  it("throws on unsupported encryption version", async () => {
    const encrypted = await encryptProfile({ firstName: "Ada" }, "correct-passphrase", {
      crypto: testCrypto,
      scryptParams: {
        N: 1024,
        r: 8,
        p: 1,
        dkLen: 32
      }
    });

    const invalidRecord = {
      ...encrypted,
      version: 2
    } as EncryptedProfileRecord;

    await expect(
      decryptProfile(invalidRecord, "correct-passphrase", {
        crypto: testCrypto
      })
    ).rejects.toThrow("Unsupported encryption version. Re-save your profile with this extension.");
  });

  it("throws on invalid scrypt parameters", async () => {
    const encrypted = await encryptProfile({ firstName: "Ada" }, "correct-passphrase", {
      crypto: testCrypto,
      scryptParams: {
        N: 1024,
        r: 8,
        p: 1,
        dkLen: 32
      }
    });

    const invalidRecord = {
      ...encrypted,
      scrypt: {
        ...encrypted.scrypt,
        N: 1234
      }
    } as EncryptedProfileRecord;

    await expect(
      decryptProfile(invalidRecord, "correct-passphrase", {
        crypto: testCrypto
      })
    ).rejects.toThrow("Invalid saved profile format.");
  });
});
