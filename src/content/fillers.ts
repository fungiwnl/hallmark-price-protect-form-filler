import type { PersonalProfile } from "../shared/profile";

export function fillPersonalDetails(profile: PersonalProfile, doc: Document = document): number {
  let filledCount = 0;

  filledCount += setInput(doc, "CreditAccountNumber", profile.accountNumber);
  filledCount += setSelect(doc, "CustomerTitle", profile.title);
  filledCount += setInput(doc, "FirstName", profile.firstName);
  filledCount += setInput(doc, "Middlename", profile.middleName);
  filledCount += setInput(doc, "Surname", profile.surname);
  filledCount += setDate(doc, "DOB", profile.dob);
  filledCount += setInput(doc, "PrimaryPhone", profile.phone);
  filledCount += setInput(doc, "EmailAddress", profile.email);
  filledCount += setInput(doc, "ConfirmEmail", profile.email);

  filledCount += setSelect(doc, "Country", profile.country);
  filledCount += setInput(doc, "StreetNumber", profile.streetNumber);
  filledCount += setInput(doc, "StreetName", profile.streetName);
  filledCount += setFirstInput(doc, ["Subrub", "Suburb"], profile.suburb);
  filledCount += setSelect(doc, "State", profile.state);
  filledCount += setInput(doc, "Postcode", profile.postcode);

  filledCount += setRadioGroup(doc, "RadioGroupIsPrimaryCard", profile.isPrimaryCardHolder);
  filledCount += setRadioGroup(doc, "RadioGroupIsPrimaryCard2", profile.authorizeAnotherPerson);
  filledCount += setRadioGroup(
    doc,
    "RadioGroupIsPrimaryCard3",
    profile.mailingSameAsResidential
  );

  filledCount += setSelect(doc, "ClaimType", profile.claimType);
  filledCount += setSelect(doc, "ItemCategory", profile.itemCategory);
  filledCount += setInput(doc, "FurtherDetails2", profile.claimItemDetails);
  filledCount += setDate(doc, "PurchaseDate", profile.purchaseDate);
  filledCount += setDate(doc, "PriceReductiondate", profile.priceReductionDate);
  filledCount += setRadioGroup(doc, "IsSaleItemSimilar", profile.isSaleItemSimilar);
  filledCount += setSelect(doc, "CurrencyType", profile.currencyType);
  filledCount += setInput(doc, "PurchasedPrice", profile.purchasedPrice);
  filledCount += setInput(doc, "RecudedPrice", profile.reducedPrice);
  filledCount += setRadioGroup(doc, "IsFullpaymentOnCard", profile.isFullPaymentOnCard);
  filledCount += setInput(doc, "PurchasedFromRetailer", profile.purchasedFromRetailer);
  filledCount += setRadioGroup(
    doc,
    "IsPricereductionFromsameR",
    profile.isPriceReductionFromSameRetailer
  );
  filledCount += setRadioGroup(doc, "PaidForExternalWarranty", profile.paidForExternalWarranty);
  filledCount += setSelect(doc, "WayOfPurchased", profile.wayOfPurchased);
  filledCount += setSelect(doc, "ReasonForPricereduction", profile.reasonForPriceReduction);
  filledCount += setRadioGroup(doc, "Claimmadeearlier", profile.hasPriorPriceReductionClaim);
  filledCount += setRadioGroup(
    doc,
    "MercendisForThisItem",
    profile.hasPriorMerchandiseProtectionClaim
  );
  filledCount += setRadioGroup(doc, "IsTaxPP2", profile.isTaxCreditEntitled);

  return filledCount;
}

function setFirstInput(doc: Document, fieldSuffixes: string[], value?: string): number {
  for (const suffix of fieldSuffixes) {
    const result = setInput(doc, suffix, value);
    if (result) {
      return result;
    }
  }
  return 0;
}

function setInput(doc: Document, fieldSuffix: string, value?: string): number {
  if (!value) {
    return 0;
  }

  const element = doc.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `input[id$="-${fieldSuffix}"], textarea[id$="-${fieldSuffix}"]`
  );
  if (!element) {
    return 0;
  }

  element.focus();
  element.value = value;
  dispatchEvents(element);
  return 1;
}

function setDate(doc: Document, fieldSuffix: string, value?: string): number {
  if (!value) {
    return 0;
  }

  const element = doc.querySelector<HTMLInputElement>(
    `input[type="date"][id$="-${fieldSuffix}"]`
  );
  if (!element) {
    return 0;
  }

  element.focus();
  element.value = value;
  dispatchEvents(element);

  const container = element.closest(".input-date");
  const displayInput = container?.querySelector<HTMLInputElement>('input[type="text"]');
  if (displayInput) {
    const [year, month, day] = value.split("-");
    if (year && month && day) {
      displayInput.value = `${day}/${month}/${year}`;
      dispatchEvents(displayInput);
    }
  }

  return 1;
}

function setSelect(doc: Document, fieldSuffix: string, value?: string): number {
  if (!value) {
    return 0;
  }

  const element = doc.querySelector<HTMLSelectElement>(`select[id$="-${fieldSuffix}"]`);
  if (!element) {
    return 0;
  }

  const normalized = String(value).trim().toLowerCase();
  const option = Array.from(element.options).find((candidate) => {
    return (
      candidate.textContent?.trim().toLowerCase() === normalized ||
      candidate.value.trim().toLowerCase() === normalized
    );
  });

  if (!option) {
    return 0;
  }

  element.focus();
  element.value = option.value;
  dispatchEvents(element);
  return 1;
}

function setRadioGroup(doc: Document, groupSuffix: string, value?: string): number {
  if (!value) {
    return 0;
  }

  const normalized = String(value).trim().toLowerCase();
  const radioValue =
    normalized === "yes" || normalized === "true" || normalized === "1"
      ? "1"
      : normalized === "no" || normalized === "false" || normalized === "2"
        ? "2"
        : "";

  if (!radioValue) {
    return 0;
  }

  const selector = `input[type="radio"][name$="-${groupSuffix}"][value="${radioValue}"]`;
  const radio = doc.querySelector<HTMLInputElement>(selector);
  if (!radio) {
    return 0;
  }

  radio.focus();
  radio.checked = true;
  radio.click();
  dispatchEvents(radio);
  return 1;
}

function dispatchEvents(element: HTMLElement): void {
  const EventCtor = element.ownerDocument.defaultView?.Event ?? Event;
  element.dispatchEvent(new EventCtor("input", { bubbles: true }));
  element.dispatchEvent(new EventCtor("change", { bubbles: true }));
  element.dispatchEvent(new EventCtor("blur", { bubbles: true }));
}
