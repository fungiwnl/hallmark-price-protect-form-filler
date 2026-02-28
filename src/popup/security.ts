export const ALLOWED_CLAIM_URL =
  "https://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim";

const MIN_PASSPHRASE_LENGTH = 12;

interface PassphraseCheck {
  valid: boolean;
  message?: string;
}

export function validatePassphrase(passphrase: string): PassphraseCheck {
  const missingRequirements: string[] = [];

  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    missingRequirements.push(`at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }
  if (!/[a-z]/.test(passphrase)) {
    missingRequirements.push("a lowercase letter");
  }
  if (!/[A-Z]/.test(passphrase)) {
    missingRequirements.push("an uppercase letter");
  }
  if (!/[0-9]/.test(passphrase)) {
    missingRequirements.push("a number");
  }
  if (!/[^A-Za-z0-9]/.test(passphrase)) {
    missingRequirements.push("a symbol");
  }

  if (missingRequirements.length === 0) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Passphrase must include ${missingRequirements.join(", ")}.`
  };
}

export function isAllowedClaimUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  let actual: URL;
  let allowed: URL;

  try {
    actual = new URL(url);
    allowed = new URL(ALLOWED_CLAIM_URL);
  } catch {
    return false;
  }

  return (
    actual.protocol === "https:" &&
    actual.origin === allowed.origin &&
    actual.pathname === allowed.pathname
  );
}
