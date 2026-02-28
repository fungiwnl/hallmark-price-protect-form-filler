export const PERSONAL_FIELD_IDS = [
  "accountNumber",
  "isPrimaryCardHolder",
  "title",
  "firstName",
  "middleName",
  "surname",
  "dob",
  "phone",
  "email",
  "authorizeAnotherPerson",
  "country",
  "streetNumber",
  "streetName",
  "suburb",
  "state",
  "postcode",
  "mailingSameAsResidential"
] as const;

export const CLAIM_FIELD_IDS = [
  "claimType",
  "itemCategory",
  "claimItemDetails",
  "purchaseDate",
  "priceReductionDate",
  "isSaleItemSimilar",
  "currencyType",
  "purchasedPrice",
  "reducedPrice",
  "isFullPaymentOnCard",
  "purchasedFromRetailer",
  "isPriceReductionFromSameRetailer",
  "paidForExternalWarranty",
  "wayOfPurchased",
  "reasonForPriceReduction",
  "hasPriorPriceReductionClaim",
  "hasPriorMerchandiseProtectionClaim",
  "isTaxCreditEntitled"
] as const;

export const FIELD_IDS = [...PERSONAL_FIELD_IDS, ...CLAIM_FIELD_IDS] as const;

export type ProfileFieldId = (typeof FIELD_IDS)[number];

export type PersonalProfile = Partial<Record<ProfileFieldId, string>>;
