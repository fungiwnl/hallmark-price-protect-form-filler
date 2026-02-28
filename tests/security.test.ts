import { describe, expect, it } from "vitest";

import {
  ALLOWED_CLAIM_URL,
  isAllowedClaimUrl,
  validatePassphrase
} from "../src/popup/security";

describe("security rules", () => {
  describe("validatePassphrase", () => {
    it("accepts a strong passphrase", () => {
      const result = validatePassphrase("StrongPassphrase1!");
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("rejects weak passphrases with actionable guidance", () => {
      const result = validatePassphrase("short");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 12 characters");
      expect(result.message).toContain("an uppercase letter");
      expect(result.message).toContain("a number");
      expect(result.message).toContain("a symbol");
    });

    it("rejects passphrases missing symbol", () => {
      const result = validatePassphrase("StrongPassphrase12");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("a symbol");
    });
  });

  describe("isAllowedClaimUrl", () => {
    it("allows the exact claim URL", () => {
      expect(isAllowedClaimUrl(ALLOWED_CLAIM_URL)).toBe(true);
    });

    it("allows same path with query/hash", () => {
      expect(isAllowedClaimUrl(`${ALLOWED_CLAIM_URL}?draft=1#section`)).toBe(true);
    });

    it("rejects different hosts or paths", () => {
      expect(
        isAllowedClaimUrl("https://example.com/HallmarkInsurance/CustomerClaim")
      ).toBe(false);
      expect(
        isAllowedClaimUrl("https://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim/")
      ).toBe(false);
      expect(
        isAllowedClaimUrl("https://maplc.outsystemsenterprise.com/HallmarkInsurance/OtherPage")
      ).toBe(false);
      expect(
        isAllowedClaimUrl("http://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim")
      ).toBe(false);
    });
  });
});
