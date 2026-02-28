import { fillPersonalDetails } from "./content/fillers";
import { CLAIM_FIELD_IDS, PERSONAL_FIELD_IDS, type PersonalProfile } from "./shared/profile";

interface FillMessage {
  type: "FILL_PERSONAL_DETAILS";
  profile?: PersonalProfile;
}

interface FillResponse {
  ok: boolean;
  error?: string;
  filledCount?: number;
}

chrome.runtime.onMessage.addListener((message: FillMessage, _sender, sendResponse) => {
  if (!message || message.type !== "FILL_PERSONAL_DETAILS") {
    return;
  }

  void handleFillRequest(message, sendResponse);
  return true;
});

async function handleFillRequest(
  message: FillMessage,
  sendResponse: (response: FillResponse) => void
): Promise<void> {
  try {
    const filledCount = await fillWithRetries(message.profile ?? {});
    if (filledCount === 0) {
      if (isClaimDetailsStep(document) && !hasAnyProfileValues(message.profile ?? {}, CLAIM_FIELD_IDS)) {
        sendResponse({
          ok: false,
          error:
            "No saved Claim Details (Step 2) values found. Enter those fields in the extension, save, then try Fill again."
        } satisfies FillResponse);
        return;
      }
      if (isPersonalDetailsStep(document) && !hasAnyProfileValues(message.profile ?? {}, PERSONAL_FIELD_IDS)) {
        sendResponse({
          ok: false,
          error:
            "No saved Personal Details values found. Enter those fields in the extension, save, then try Fill again."
        } satisfies FillResponse);
        return;
      }
      sendResponse({
        ok: false,
        error: "No supported claim form fields were found on this page."
      } satisfies FillResponse);
      return;
    }

    sendResponse({ ok: true, filledCount } satisfies FillResponse);
  } catch (error: unknown) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    } satisfies FillResponse);
  }
}

async function fillWithRetries(profile: PersonalProfile): Promise<number> {
  const maxAttempts = 10;
  const intervalMs = 150;
  let bestFilledCount = 0;
  let staleAttempts = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const filledCount = fillPersonalDetails(profile);
    if (filledCount > bestFilledCount) {
      bestFilledCount = filledCount;
      staleAttempts = 0;
    } else {
      staleAttempts += 1;
    }

    if (bestFilledCount > 0 && staleAttempts >= 2) {
      break;
    }

    if (attempt < maxAttempts - 1) {
      await delay(intervalMs);
    }
  }

  return bestFilledCount;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasAnyProfileValues(profile: PersonalProfile, fieldIds: readonly string[]): boolean {
  return fieldIds.some((fieldId) => {
    const value = profile[fieldId as keyof PersonalProfile];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function isClaimDetailsStep(doc: Document): boolean {
  return Boolean(
    doc.querySelector('select[id$="-ClaimType"]') ||
      doc.querySelector('select[id$="-ItemCategory"]') ||
      doc.querySelector('input[name$="-IsTaxPP2"]')
  );
}

function isPersonalDetailsStep(doc: Document): boolean {
  return Boolean(
    doc.querySelector('input[id$="-FirstName"]') ||
      doc.querySelector('input[id$="-Surname"]') ||
      doc.querySelector('input[name$="-RadioGroupIsPrimaryCard"]')
  );
}
