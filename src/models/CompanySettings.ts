import mongoose, { model, Schema, type Document, type Model } from "mongoose";
import { COMPANY_FIELD_VISIBILITY_KEYS, DEFAULT_COMPANY_SETTINGS, DEFAULT_FIELD_VISIBILITY, LR_FORMATS, type CompanySettingsValues } from "@/lib/company-settings";
import type { ChargeDefinition } from "@/lib/charges";

export interface ICompanySettings extends CompanySettingsValues, Document {
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySettingsSchema = new Schema<ICompanySettings>(
  {
    ownerId: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, default: "", trim: true, maxlength: 160 },
    tagline: { type: String, default: "", trim: true, maxlength: 120 },
    mobile1: { type: String, default: "", trim: true, maxlength: 30 },
    mobile2: { type: String, default: "", trim: true, maxlength: 30 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 254 },
    website: { type: String, default: "", trim: true, maxlength: 2048 },
    addressLine: { type: String, default: "", trim: true, maxlength: 300 },
    country: { type: String, default: "India", trim: true, maxlength: 100 },
    state: { type: String, default: "", trim: true, maxlength: 100 },
    city: { type: String, default: "", trim: true, maxlength: 100 },
    pinCode: { type: String, default: "", trim: true, maxlength: 20 },
    gstNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 15 },
    panNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 10 },
    tanNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 10 },
    cinNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 21 },
    udyamNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 19 },
    uinNumber: { type: String, default: "", trim: true, uppercase: true, maxlength: 20 },
    registrationNumber: { type: String, default: "", trim: true, maxlength: 40 },
    fieldVisibility: {
      type: new Schema(
        Object.fromEntries(COMPANY_FIELD_VISIBILITY_KEYS.map((key) => [key, { type: Boolean, default: true }])),
        { _id: false }
      ),
      default: () => ({ ...DEFAULT_FIELD_VISIBILITY }),
    },
    accountHolderName: { type: String, default: "", trim: true, maxlength: 160 },
    bankName: { type: String, default: "", trim: true, maxlength: 160 },
    accountNumber: { type: String, default: "", trim: true, maxlength: 34 },
    ifscCode: { type: String, default: "", trim: true, uppercase: true, maxlength: 11 },
    bankBranch: { type: String, default: "", trim: true, maxlength: 160 },
    accountType: { type: String, enum: ["Current", "Saving", "Others"], default: "Current" },
    otherAccountType: { type: String, default: "", trim: true, maxlength: 80 },
    upiId: { type: String, default: "", trim: true, maxlength: 100 },
    companyLogo: { type: String, default: "", maxlength: 350000 },
    signature: { type: String, default: "", maxlength: 350000 },
    upiQrCode: { type: String, default: "", maxlength: 350000 },
    consignmentStartNumber: { type: Number, default: 1, min: 1, max: 999999999999 },
    invoiceTerms: { type: String, default: "", maxlength: 10000 },
    quotationTerms: { type: String, default: "", maxlength: 10000 },
    lrTerms: { type: String, default: "", maxlength: 10000 },
    lrFormat: { type: String, enum: LR_FORMATS, default: DEFAULT_COMPANY_SETTINGS.lrFormat },
    lorryHireStartNumber: { type: Number, default: 1, min: 1, max: 999999999999 },
lorryHireTerms: { type: String, default: "", maxlength: 10000 },
    lrFormatBackgrounds: {
      type: new Schema(
        Object.fromEntries(
          LR_FORMATS.map((format) => [
            format,
            {
              backgroundColor: { type: String, default: "#ffffff", match: /^#[0-9a-fA-F]{6}$/ },
              backgroundImage: { type: String, default: "", maxlength: 350000 },
            },
          ])
        ),
        { _id: false }
      ),
      default: DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
    },
    chargeDefinitions: {
      type: [
        new Schema<ChargeDefinition>(
          {
            id: { type: String, required: true, trim: true, maxlength: 48 },
            name: { type: String, required: true, trim: true, maxlength: 60 },
            defaultAmount: { type: Number, default: null, min: 0, max: 1000000000 },
            includeOnBilty: { type: Boolean, required: true },
            includeOnBill: { type: Boolean, required: true },
            legacyBiltyField: { type: String, trim: true },
            legacyBillField: { type: String, trim: true },
          },
          { _id: false }
        ),
      ],
      default: DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
      validate: (value: ChargeDefinition[]) => Array.isArray(value) && value.length <= 40,
    },
  },
  { timestamps: true }
);

const CompanySettingsModel: Model<ICompanySettings> =
  (mongoose.models.CompanySettings as Model<ICompanySettings>) ||
  model<ICompanySettings>("CompanySettings", companySettingsSchema);

let legacyIndexCleanup: Promise<void> | undefined;

export async function removeLegacyCompanyIdIndex(): Promise<void> {
  if (!legacyIndexCleanup) {
    legacyIndexCleanup = (async () => {
      let indexes;
      try {
        indexes = await CompanySettingsModel.collection.indexes();
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === 26
        ) {
          return;
        }
        throw error;
      }

      const legacyIndex = indexes.find(
        (index) =>
          index.name === "companyId_1" &&
          index.unique === true &&
          Object.keys(index.key).length === 1 &&
          index.key.companyId === 1
      );
      if (legacyIndex?.name) {
        try {
          await CompanySettingsModel.collection.dropIndex(legacyIndex.name);
        } catch (error) {
          const remainingIndexes = await CompanySettingsModel.collection.indexes();
          if (
            remainingIndexes.some(
              (index) =>
                index.name === "companyId_1" &&
                index.unique === true &&
                Object.keys(index.key).length === 1 &&
                index.key.companyId === 1
            )
          ) {
            throw error;
          }
        }
      }
    })();
  }

  try {
    await legacyIndexCleanup;
  } catch (error) {
    legacyIndexCleanup = undefined;
    throw error;
  }
}

export default CompanySettingsModel;
