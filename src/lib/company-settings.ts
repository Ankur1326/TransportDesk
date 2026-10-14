import { DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";

export const LR_FORMATS = ["classic", "modern", "compact", "ledger"] as const;
export type LRFormat = (typeof LR_FORMATS)[number];

export interface LRFormatBackground {
  backgroundColor: string;
  backgroundImage: string;
}

export interface CompanySettingsValues {
  companyName: string;
  mobile1: string;
  mobile2: string;
  email: string;
  website: string;
  addressLine: string;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  gstNumber: string;
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
  consignmentStartNumber: 2051,
  invoiceTerms: "",
  quotationTerms: "",
  lrTerms: "",
  lrFormat: "classic",
  lrFormatBackgrounds: {
    classic: { backgroundColor: "#ffffff", backgroundImage: "" },
    modern: { backgroundColor: "#ffffff", backgroundImage: "" },
    compact: { backgroundColor: "#ffffff", backgroundImage: "" },
    ledger: { backgroundColor: "#ffffff", backgroundImage: "" },
  },
  chargeDefinitions: DEFAULT_CHARGE_DEFINITIONS,
};

export interface CompanySettingsResponse {
  success: boolean;
  message?: string;
  data?: CompanySettingsValues;
}
