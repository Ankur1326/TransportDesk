import { DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";

export const LR_FORMATS = ["classic", "modern", "compact", "ledger", "executive", "minimal", "bold"] as const;
export type LRFormat = (typeof LR_FORMATS)[number];

export interface LRFormatBackground {
  backgroundColor: string;
  backgroundImage: string;
}

/** Company details the user can individually show or hide on printed documents. */
export const COMPANY_FIELD_VISIBILITY_KEYS = [
  "companyLogo",
  "signature",
  "mobile1",
  "mobile2",
  "email",
  "website",
  "tagline",
  "gstNumber",
  "panNumber",
  "tanNumber",
  "cinNumber",
  "udyamNumber",
  "uinNumber",
  "registrationNumber",
] as const;
export type CompanyFieldVisibilityKey = (typeof COMPANY_FIELD_VISIBILITY_KEYS)[number];
export type CompanyFieldVisibility = Record<CompanyFieldVisibilityKey, boolean>;

export const DEFAULT_FIELD_VISIBILITY: CompanyFieldVisibility = Object.fromEntries(
  COMPANY_FIELD_VISIBILITY_KEYS.map((key) => [key, true])
) as CompanyFieldVisibility;

/** Registration identifiers printed in the document header, in print order. */
export const REGISTRATION_ID_FIELDS = [
  { key: "gstNumber", label: "GSTIN" },
  { key: "panNumber", label: "PAN" },
  { key: "tanNumber", label: "TAN" },
  { key: "cinNumber", label: "CIN" },
  { key: "udyamNumber", label: "Udyam" },
  { key: "uinNumber", label: "UIN" },
  { key: "registrationNumber", label: "Reg. No." },
] as const;
export type RegistrationIdKey = (typeof REGISTRATION_ID_FIELDS)[number]["key"];

export interface CompanySettingsValues {
  companyName: string;
  tagline: string;
  /** Shown as "Phone" in the UI. */
  mobile1: string;
  /** Shown as "Alternate Phone" in the UI. */
  mobile2: string;
  email: string;
  website: string;
  addressLine: string;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  gstNumber: string;
  panNumber: string;
  tanNumber: string;
  cinNumber: string;
  udyamNumber: string;
  uinNumber: string;
  registrationNumber: string;
  fieldVisibility: CompanyFieldVisibility;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
  accountType: "Current" | "Saving" | "Others";
  otherAccountType: string;
  upiId: string;
  companyLogo: string;
  signature: string;
  upiQrCode: string;
  consignmentStartNumber: number;
  invoiceTerms: string;
  quotationTerms: string;
  lrTerms: string;
  lrFormat: LRFormat;
  lrFormatBackgrounds: Record<LRFormat, LRFormatBackground>;
  chargeDefinitions: ChargeDefinition[];
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsValues = {
  companyName: "",
  tagline: "",
  mobile1: "",
  mobile2: "",
  email: "",
  website: "",
  addressLine: "",
  country: "India",
  state: "",
  city: "",
  pinCode: "",
  gstNumber: "",
  panNumber: "",
  tanNumber: "",
  cinNumber: "",
  udyamNumber: "",
  uinNumber: "",
  registrationNumber: "",
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  bankBranch: "",
  accountType: "Current",
  otherAccountType: "",
  upiId: "",
  companyLogo: "",
  signature: "",
  upiQrCode: "",
  consignmentStartNumber: 1,
  invoiceTerms: "",
  quotationTerms: "",
  lrTerms: "",
  lrFormat: "classic",
  lrFormatBackgrounds: Object.fromEntries(
    LR_FORMATS.map((format) => [format, { backgroundColor: "#ffffff", backgroundImage: "" }])
  ) as Record<LRFormat, LRFormatBackground>,
  chargeDefinitions: DEFAULT_CHARGE_DEFINITIONS,
};

export interface CompanySettingsResponse {
  success: boolean;
  message?: string;
  data?: CompanySettingsValues;
}


/** Fields the company-settings form requires before it can be saved. */
const REQUIRED_PROFILE_FIELDS: { key: keyof CompanySettingsValues; label: string }[] = [
  { key: "companyName", label: "company name" },
];

/** Human-readable names of the required company details that are still empty. */
export function getMissingCompanyFields(settings: CompanySettingsValues): string[] {
  return REQUIRED_PROFILE_FIELDS.filter(({ key }) => {
    const value = settings[key];
    return typeof value !== "string" || !value.trim();
  }).map(({ label }) => label);
}


/** Saved settings merged over defaults, including nested objects older records may lack. */
export function normalizeCompanySettings(data: Partial<CompanySettingsValues>): CompanySettingsValues {
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...data,
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY, ...data.fieldVisibility },
    lrFormatBackgrounds: {
      ...DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
      ...data.lrFormatBackgrounds,
    },
    chargeDefinitions: data.chargeDefinitions ?? DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
  };
}

export interface CompanyDocumentInfo {
  logo: string;
  signature: string;
  phone: string;
  alternatePhone: string;
  /** Visible phone numbers joined with the given separator. */
  phones: (separator?: string) => string;
  email: string;
  website: string;
  tagline: string;
  /** Registration identifiers that are filled in and switched on, in print order. */
  identifiers: { key: RegistrationIdKey; label: string; value: string }[];
}

/**
 * What a printed document may show for this company. Every document header
 * goes through here so the show/hide toggles are honoured everywhere.
 */
export function getCompanyDocumentInfo(company: CompanySettingsValues): CompanyDocumentInfo {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...company.fieldVisibility };
  const pick = (key: CompanyFieldVisibilityKey) => (visibility[key] ? String(company[key as keyof CompanySettingsValues] ?? "").trim() : "");
  const phone = pick("mobile1");
  const alternatePhone = pick("mobile2");
  const identifiers = REGISTRATION_ID_FIELDS
    .map((item) => ({ ...item, value: pick(item.key) }))
    .filter((item) => item.value);

  return {
    logo: pick("companyLogo"),
    signature: pick("signature"),
    phone,
    alternatePhone,
    phones: (separator = ", ") => [phone, alternatePhone].filter(Boolean).join(separator),
    email: pick("email"),
    website: pick("website"),
    tagline: pick("tagline"),
    identifiers,
  };
}
