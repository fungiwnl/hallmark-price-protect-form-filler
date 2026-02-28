export const SESSION_CACHE_CLEAR_ALARM = "clearDecryptedProfileSession";

const MIN_ALARM_DELAY_MINUTES = 1 / 60;

export async function scheduleSessionCacheClearAlarm(ttlMs: number): Promise<void> {
  if (!chrome.alarms?.create) {
    return;
  }

  const delayInMinutes = Math.max(ttlMs / 60_000, MIN_ALARM_DELAY_MINUTES);
  await chrome.alarms.clear(SESSION_CACHE_CLEAR_ALARM);
  await chrome.alarms.create(SESSION_CACHE_CLEAR_ALARM, { delayInMinutes });
}

export async function clearSessionCacheClearAlarm(): Promise<void> {
  if (!chrome.alarms?.clear) {
    return;
  }
  await chrome.alarms.clear(SESSION_CACHE_CLEAR_ALARM);
}
