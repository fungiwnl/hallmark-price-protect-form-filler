export const ALLOWED_CLAIM_URL =
  "https://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim";

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
