import { clearCachedProfile, SESSION_PROFILE_CACHE_KEY } from "./popup/sessionCache";
import {
  clearSessionCacheClearAlarm,
  scheduleSessionCacheClearAlarm,
  SESSION_CACHE_CLEAR_ALARM
} from "./shared/sessionExpiry";

interface SessionProfileCacheRecordLike {
  expiresAt: number;
}

void reconcileSessionCacheState();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SESSION_CACHE_CLEAR_ALARM) {
    return;
  }

  void clearDecryptedCache();
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileSessionCacheState();
});

chrome.runtime.onInstalled.addListener(() => {
  void reconcileSessionCacheState();
});

async function clearDecryptedCache(): Promise<void> {
  await clearCachedProfile();
  await clearSessionCacheClearAlarm();
}

async function reconcileSessionCacheState(): Promise<void> {
  const stored = (await chrome.storage.session.get(SESSION_PROFILE_CACHE_KEY)) as Record<
    string,
    unknown
  >;
  const candidate = stored[SESSION_PROFILE_CACHE_KEY];
  if (!isSessionProfileCacheRecord(candidate)) {
    await clearDecryptedCache();
    return;
  }

  const nowMs = Date.now();
  if (candidate.expiresAt <= nowMs) {
    await clearDecryptedCache();
    return;
  }

  await scheduleSessionCacheClearAlarm(candidate.expiresAt - nowMs);
}

function isSessionProfileCacheRecord(candidate: unknown): candidate is SessionProfileCacheRecordLike {
  return (
    Boolean(candidate) &&
    typeof candidate === "object" &&
    typeof (candidate as Partial<SessionProfileCacheRecordLike>).expiresAt === "number"
  );
}
