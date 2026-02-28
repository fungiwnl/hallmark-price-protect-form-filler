import type { PersonalProfile } from "../shared/profile";

export const SESSION_PROFILE_CACHE_KEY = "decryptedProfileSessionV1";
export const SESSION_PROFILE_TTL_MS = 60_000;

interface SessionProfileCacheRecord {
  profile: PersonalProfile;
  expiresAt: number;
}

interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

interface StorageAreasLike {
  session?: StorageAreaLike;
}

let inMemoryCacheRecord: SessionProfileCacheRecord | undefined;

export async function readCachedProfile(
  storageAreas?: StorageAreasLike,
  nowMs: number = Date.now()
): Promise<PersonalProfile | undefined> {
  const sessionStorage = resolveSessionStorage(storageAreas);
  if (sessionStorage) {
    const stored = (await sessionStorage.get(SESSION_PROFILE_CACHE_KEY)) as Record<string, unknown>;
    const candidate = stored[SESSION_PROFILE_CACHE_KEY];

    if (isValidCacheRecord(candidate, nowMs)) {
      return candidate.profile;
    }

    if (candidate !== undefined) {
      await sessionStorage.remove(SESSION_PROFILE_CACHE_KEY);
    }

    return undefined;
  }

  if (isValidCacheRecord(inMemoryCacheRecord, nowMs)) {
    return inMemoryCacheRecord.profile;
  }

  inMemoryCacheRecord = undefined;
  return undefined;
}

export async function writeCachedProfile(
  profile: PersonalProfile,
  storageAreas?: StorageAreasLike,
  nowMs: number = Date.now(),
  ttlMs: number = SESSION_PROFILE_TTL_MS
): Promise<void> {
  const record: SessionProfileCacheRecord = {
    profile,
    expiresAt: nowMs + ttlMs
  };
  inMemoryCacheRecord = record;

  const sessionStorage = resolveSessionStorage(storageAreas);
  if (sessionStorage) {
    await sessionStorage.set({ [SESSION_PROFILE_CACHE_KEY]: record });
  }
}

export async function clearCachedProfile(storageAreas?: StorageAreasLike): Promise<void> {
  inMemoryCacheRecord = undefined;
  const sessionStorage = resolveSessionStorage(storageAreas);
  if (sessionStorage) {
    await sessionStorage.remove(SESSION_PROFILE_CACHE_KEY);
  }
}

function resolveSessionStorage(storageAreas?: StorageAreasLike): StorageAreaLike | undefined {
  if (storageAreas) {
    return storageAreas.session;
  }

  return chrome.storage.session as unknown as StorageAreaLike | undefined;
}

function isValidCacheRecord(
  candidate: unknown,
  nowMs: number
): candidate is SessionProfileCacheRecord {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const record = candidate as Partial<SessionProfileCacheRecord>;
  return (
    typeof record.expiresAt === "number" &&
    record.expiresAt > nowMs &&
    Boolean(record.profile) &&
    typeof record.profile === "object"
  );
}
