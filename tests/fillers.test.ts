/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { fillPersonalDetails } from "../src/content/fillers";

describe("content fillers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="form-CreditAccountNumber" />
      <select id="form-CustomerTitle">
        <option value="">Select</option>
        <option value="Mr">Mr</option>
      </select>
      <input id="form-FirstName" />
      <input id="form-Middlename" />
      <input id="form-Surname" />
      <div class="input-date">
        <input type="date" id="form-DOB" />
        <input type="text" id="dob-display" />
      </div>
      <input id="form-PrimaryPhone" />
      <input id="form-EmailAddress" />
      <input id="form-ConfirmEmail" />

      <select id="form-Country">
        <option value="">Select</option>
        <option value="Australia">Australia</option>
      </select>
      <input id="form-StreetNumber" />
      <input id="form-StreetName" />
      <input id="form-Suburb" />
      <select id="form-State">
        <option value="">Select</option>
        <option value="VIC">VIC</option>
      </select>
      <input id="form-Postcode" />

      <input type="radio" name="group-RadioGroupIsPrimaryCard" value="1" />
      <input type="radio" name="group-RadioGroupIsPrimaryCard" value="2" />
      <input type="radio" name="group-RadioGroupIsPrimaryCard2" value="1" />
      <input type="radio" name="group-RadioGroupIsPrimaryCard2" value="2" />
      <input type="radio" name="group-RadioGroupIsPrimaryCard3" value="1" />
      <input type="radio" name="group-RadioGroupIsPrimaryCard3" value="2" />

      <select id="form-ClaimType">
        <option value="">Select</option>
        <option value="0">Price Protection</option>
      </select>
      <select id="form-ItemCategory">
        <option value="">Select</option>
        <option value="1">Electronics</option>
      </select>
      <textarea id="form-FurtherDetails2"></textarea>
      <div class="input-date">
        <input type="date" id="form-PurchaseDate" />
        <input type="text" id="purchase-date-display" />
      </div>
      <div class="input-date">
        <input type="date" id="form-PriceReductiondate" />
        <input type="text" id="price-reduction-date-display" />
      </div>
      <input type="radio" name="group-IsSaleItemSimilar" value="1" />
      <input type="radio" name="group-IsSaleItemSimilar" value="2" />
      <select id="form-CurrencyType">
        <option value="">Select</option>
        <option value="0">AUD</option>
      </select>
      <input id="form-PurchasedPrice" />
      <input id="form-RecudedPrice" />
      <input type="radio" name="group-IsFullpaymentOnCard" value="1" />
      <input type="radio" name="group-IsFullpaymentOnCard" value="2" />
      <input id="form-PurchasedFromRetailer" />
      <input type="radio" name="group-IsPricereductionFromsameR" value="1" />
      <input type="radio" name="group-IsPricereductionFromsameR" value="2" />
      <input type="radio" name="group-PaidForExternalWarranty" value="1" />
      <input type="radio" name="group-PaidForExternalWarranty" value="2" />
      <select id="form-WayOfPurchased">
        <option value="">Select</option>
        <option value="4">None of the above</option>
      </select>
      <select id="form-ReasonForPricereduction">
        <option value="">Select</option>
        <option value="3">Reduced as part of normal sale</option>
      </select>
      <input type="radio" name="group-Claimmadeearlier" value="1" />
      <input type="radio" name="group-Claimmadeearlier" value="2" />
      <input type="radio" name="group-MercendisForThisItem" value="1" />
      <input type="radio" name="group-MercendisForThisItem" value="2" />
      <input type="radio" name="group-IsTaxPP2" value="1" />
      <input type="radio" name="group-IsTaxPP2" value="2" />
    `;
  });

  it("fills matching fields and returns the number of updated controls", () => {
    const filledCount = fillPersonalDetails({
      accountNumber: "1234",
      title: "mr",
      firstName: "Ada",
      middleName: "Byron",
      surname: "Lovelace",
      dob: "1815-12-10",
      phone: "0400000000",
      email: "ada@example.com",
      country: "australia",
      streetNumber: "10",
      streetName: "Main St",
      suburb: "Melbourne",
      state: "vic",
      postcode: "3000",
      isPrimaryCardHolder: "yes",
      authorizeAnotherPerson: "no",
      mailingSameAsResidential: "yes",
      claimType: "price protection",
      itemCategory: "electronics",
      claimItemDetails: "128GB, blue",
      purchaseDate: "2026-02-01",
      priceReductionDate: "2026-02-20",
      isSaleItemSimilar: "yes",
      currencyType: "aud",
      purchasedPrice: "1500",
      reducedPrice: "1200",
      isFullPaymentOnCard: "yes",
      purchasedFromRetailer: "Retailer X",
      isPriceReductionFromSameRetailer: "no",
      paidForExternalWarranty: "no",
      wayOfPurchased: "none of the above",
      reasonForPriceReduction: "reduced as part of normal sale",
      hasPriorPriceReductionClaim: "no",
      hasPriorMerchandiseProtectionClaim: "no",
      isTaxCreditEntitled: "yes"
    });

    expect(filledCount).toBe(36);
    expect((document.querySelector<HTMLInputElement>('#form-FirstName') as HTMLInputElement).value).toBe(
      "Ada"
    );
    expect((document.querySelector<HTMLInputElement>('#form-DOB') as HTMLInputElement).value).toBe(
      "1815-12-10"
    );
    expect(
      (document.querySelector<HTMLInputElement>('#dob-display') as HTMLInputElement).value
    ).toBe("10/12/1815");
    expect(
      (
        document.querySelector<HTMLInputElement>(
          'input[name="group-RadioGroupIsPrimaryCard"][value="1"]'
        ) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(
      (
        document.querySelector<HTMLInputElement>(
          'input[name="group-RadioGroupIsPrimaryCard2"][value="2"]'
        ) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(
      (document.querySelector<HTMLTextAreaElement>("#form-FurtherDetails2") as HTMLTextAreaElement)
        .value
    ).toBe("128GB, blue");
    expect(
      (document.querySelector<HTMLInputElement>("#form-PurchaseDate") as HTMLInputElement).value
    ).toBe("2026-02-01");
    expect(
      (
        document.querySelector<HTMLInputElement>(
          'input[name="group-IsPricereductionFromsameR"][value="2"]'
        ) as HTMLInputElement
      ).checked
    ).toBe(true);
  });

  it("returns zero when no matching form controls exist", () => {
    document.body.innerHTML = "<div>no fields here</div>";

    const filledCount = fillPersonalDetails({
      firstName: "Ada",
      isPrimaryCardHolder: "yes"
    });

    expect(filledCount).toBe(0);
  });
});
