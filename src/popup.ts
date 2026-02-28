import { decryptProfile, encryptProfile, type EncryptedProfileRecord } from "./popup/crypto";
import { ALLOWED_CLAIM_URL, isAllowedClaimUrl, validatePassphrase } from "./popup/security";
import {
  clearCachedProfile,
  readCachedProfile,
  SESSION_PROFILE_TTL_MS,
  writeCachedProfile
} from "./popup/sessionCache";
import { FIELD_IDS, type PersonalProfile } from "./shared/profile";
import {
  clearSessionCacheClearAlarm,
  scheduleSessionCacheClearAlarm
} from "./shared/sessionExpiry";

const STORAGE_KEY = "secureProfileV1";
type ValueElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FillResponse {
  ok: boolean;
  error?: string;
  filledCount?: number;
}

const statusEl = requireHTMLElement("status");
const savedMetaEl = requireHTMLElement("savedMeta");

requireButtonElement("saveButton").addEventListener("click", () => {
  void saveSecurely();
});
requireButtonElement("loadButton").addEventListener("click", () => {
  void loadSavedProfile();
});
requireButtonElement("fillButton").addEventListener("click", () => {
  void fillCurrentTab();
});
requireButtonElement("clearButton").addEventListener("click", () => {
  void clearSavedProfile();
});

void initializePopup();

async function initializePopup(): Promise<void> {
  applyDefaultFormValues();
  await refreshSavedMeta();
  await hydrateFormFromCache();
}

function getProfileFromForm(): PersonalProfile {
  const profile: PersonalProfile = {};
  for (const id of FIELD_IDS) {
    const value = getFieldValue(id).trim();
    if (value) {
      profile[id] = value;
    }
  }
  if (!profile.priceReductionDate) {
    profile.priceReductionDate = getTodayLocalDate();
  }
  return profile;
}

function setProfileToForm(profile: PersonalProfile): void {
  for (const id of FIELD_IDS) {
    const defaultValue = id === "priceReductionDate" ? getTodayLocalDate() : "";
    setFieldValue(id, profile[id] ?? defaultValue);
  }
}

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.className = isError ? "error" : "ok";
}

async function refreshSavedMeta(): Promise<void> {
  const stored = (await chrome.storage.local.get(STORAGE_KEY)) as Record<
    string,
    EncryptedProfileRecord | undefined
  >;
  const encrypted = stored[STORAGE_KEY];

  if (!encrypted) {
    savedMetaEl.textContent = "No saved profile found.";
    return;
  }

  const savedAt = encrypted.savedAt ? new Date(encrypted.savedAt) : null;
  const prettyDate =
    savedAt && !Number.isNaN(savedAt.valueOf()) ? savedAt.toLocaleString() : "unknown time";

  savedMetaEl.textContent = `Saved profile: ${prettyDate}`;
}

async function saveSecurely(): Promise<void> {
  try {
    const passphrase = getPassphrase();
    const passphraseCheck = validatePassphrase(passphrase);
    if (!passphraseCheck.valid) {
      setStatus(passphraseCheck.message ?? "Passphrase does not meet security requirements.", true);
      return;
    }

    const profile = getProfileFromForm();
    if (!Object.keys(profile).length) {
      setStatus("Enter at least one detail before saving.", true);
      return;
    }

    const encrypted = await encryptProfile(profile, passphrase);
    await chrome.storage.local.set({ [STORAGE_KEY]: encrypted });
    await writeCachedProfile(profile);
    await scheduleSessionCacheClearAlarm(SESSION_PROFILE_TTL_MS);

    setStatus(
      `Profile encrypted and saved locally. Temporary autofill cache active for ${
        SESSION_PROFILE_TTL_MS / 1000
      } seconds.`
    );
    await refreshSavedMeta();
  } catch (error: unknown) {
    setStatus(`Save failed: ${toErrorMessage(error)}`, true);
  }
}

async function loadSavedProfile(): Promise<void> {
  try {
    const cachedProfile = await readCachedProfile();
    if (cachedProfile) {
      setProfileToForm(cachedProfile);
      setStatus(
        `Loaded cached profile. No passphrase needed within ${
          SESSION_PROFILE_TTL_MS / 1000
        } seconds.`
      );
      return;
    }

    const passphrase = getPassphrase();
    if (!passphrase) {
      setStatus("Enter passphrase to decrypt.", true);
      return;
    }

    const encrypted = await loadStoredProfile();
    if (!encrypted) {
      setStatus("No saved profile found.", true);
      return;
    }

    const profile = await decryptProfile(encrypted, passphrase);
    await writeCachedProfile(profile);
    await scheduleSessionCacheClearAlarm(SESSION_PROFILE_TTL_MS);
    setProfileToForm(profile);
    setStatus(
      `Saved profile loaded. Temporary autofill cache active for ${
        SESSION_PROFILE_TTL_MS / 1000
      } seconds.`
    );
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    if (message === "Unsupported encryption version. Re-save your profile with this extension.") {
      setStatus(message, true);
      return;
    }
    setStatus("Could not decrypt. Check your passphrase.", true);
  }
}

async function hydrateFormFromCache(): Promise<void> {
  const cachedProfile = await readCachedProfile();
  if (!cachedProfile) {
    return;
  }

  setProfileToForm(cachedProfile);
  setStatus(
    `Loaded cached profile. No passphrase needed within ${SESSION_PROFILE_TTL_MS / 1000} seconds.`
  );
}

async function fillCurrentTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }
    if (!isAllowedClaimUrl(tab.url)) {
      setStatus(`Autofill is only allowed on ${ALLOWED_CLAIM_URL}.`, true);
      return;
    }

    let profile = await readCachedProfile();

    if (!profile) {
      const passphrase = getPassphrase();
      if (!passphrase) {
        setStatus("Enter passphrase to decrypt.", true);
        return;
      }

      const encrypted = await loadStoredProfile();
      if (!encrypted) {
        setStatus("No saved profile found.", true);
        return;
      }

      profile = await decryptProfile(encrypted, passphrase);
      await writeCachedProfile(profile);
      await scheduleSessionCacheClearAlarm(SESSION_PROFILE_TTL_MS);
    }
    if (!profile.priceReductionDate) {
      profile.priceReductionDate = getTodayLocalDate();
    }

    const response = await sendMessageToTab(tab.id, {
      type: "FILL_PERSONAL_DETAILS",
      profile
    });

    if (!response?.ok) {
      setStatus(response?.error ?? "No matching form fields were found.", true);
      return;
    }

    setStatus(`Filled ${response.filledCount ?? 0} field(s) in current tab.`);
  } catch (error: unknown) {
    setStatus(toErrorMessage(error), true);
  }
}

async function clearSavedProfile(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
  await clearCachedProfile();
  await clearSessionCacheClearAlarm();
  setStatus("Saved profile deleted.");
  await refreshSavedMeta();
}

async function loadStoredProfile(): Promise<EncryptedProfileRecord | undefined> {
  const stored = (await chrome.storage.local.get(STORAGE_KEY)) as Record<
    string,
    EncryptedProfileRecord | undefined
  >;
  return stored[STORAGE_KEY];
}

function sendMessageToTab(tabId: number, message: object): Promise<FillResponse | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response?: FillResponse) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(
          new Error(
            "Unable to reach form fields on this page. Refresh the claim page and try again."
          )
        );
        return;
      }
      resolve(response);
    });
  });
}

function getPassphrase(): string {
  return requireInputElement("passphrase").value;
}

function getFieldValue(fieldId: string): string {
  return requireValueElement(fieldId).value;
}

function setFieldValue(fieldId: string, value: string): void {
  requireValueElement(fieldId).value = value;
}

function applyDefaultFormValues(): void {
  if (!getFieldValue("priceReductionDate").trim()) {
    setFieldValue("priceReductionDate", getTodayLocalDate());
  }
}

function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requireHTMLElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found.`);
  }
  return element;
}

function requireButtonElement(id: string): HTMLButtonElement {
  const element = requireHTMLElement(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected #${id} to be a <button>.`);
  }
  return element;
}

function requireInputElement(id: string): HTMLInputElement {
  const element = requireHTMLElement(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected #${id} to be an <input>.`);
  }
  return element;
}

function requireValueElement(id: string): ValueElement {
  const element = requireHTMLElement(id);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element;
  }
  throw new Error(`Expected #${id} to be an <input>, <select>, or <textarea>.`);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
