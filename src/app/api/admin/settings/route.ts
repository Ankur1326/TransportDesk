import { NextResponse } from "next/server";

import { getAuthenticatedCompanyId } from "@/lib/company-auth";
import {
  COMPANY_FIELD_VISIBILITY_KEYS,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_FIELD_VISIBILITY,
  LR_FORMATS,
  type LRFormat,
  type CompanySettingsValues,
} from "@/lib/company-settings";
import { DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";
import dbConnect from "@/lib/db";
import { loadCompanySettings } from "@/lib/company-settings-server";
import CompanySettings, { removeLegacyCompanyIdIndex } from "@/models/CompanySettings";

const TEXT_LIMITS: Partial<Record<keyof CompanySettingsValues, number>> = {
  companyName: 160,
  mobile1: 30,
  mobile2: 30,
  email: 254,
  website: 2048,
  addressLine: 300,
  country: 100,
  state: 100,
  city: 100,
  pinCode: 20,
  gstNumber: 15,
  panNumber: 10,
  registrationNumber: 40,
  accountHolderName: 160,
  bankName: 160,
  accountNumber: 34,
  ifscCode: 11,
  bankBranch: 160,
  otherAccountType: 80,
  upiId: 100,
  invoiceTerms: 10000,
  quotationTerms: 10000,
  lrTerms: 10000,
};

const IMAGE_FIELDS = ["companyLogo", "signature", "upiQrCode"] as const;
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_IMAGE_BYTES = 256 * 1024;

function imageHasValidSignature(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === "png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (mimeType === "jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return mimeType === "webp" &&
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
}

function validateImage(value: unknown): boolean {
  if (value === "") return true;
  if (typeof value !== "string") return false;

  const match = IMAGE_PATTERN.exec(value);
  if (!match) return false;

  const bytes = Buffer.from(match[2], "base64");
  return bytes.length <= MAX_IMAGE_BYTES && imageHasValidSignature(match[1], bytes);
}

function isLRFormat(value: unknown): value is LRFormat {
  return typeof value === "string" && LR_FORMATS.some((format) => format === value);
}

function validateChargeDefinitions(value: unknown): ChargeDefinition[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const ids = new Set<string>();
  const names = new Set<string>();
  const standardDefinitions = new Map(
    DEFAULT_CHARGE_DEFINITIONS.map((definition) => [definition.id, definition])
  );
  const definitions: ChargeDefinition[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const charge = entry as Record<string, unknown>;
    if (
      typeof charge.id !== "string" ||
      !/^[a-z0-9_-]{1,48}$/.test(charge.id) ||
      typeof charge.name !== "string" ||
      !charge.name.trim() ||
      charge.name.trim().length > 60 ||
      (charge.defaultAmount !== null &&
        charge.defaultAmount !== undefined &&
        (typeof charge.defaultAmount !== "number" ||
          !Number.isFinite(charge.defaultAmount) ||
          charge.defaultAmount < 0 ||
          charge.defaultAmount > 1000000000)) ||
      typeof charge.includeOnBilty !== "boolean" ||
      typeof charge.includeOnBill !== "boolean"
    ) return null;

    const nameKey = charge.name.trim().toLocaleLowerCase();
    if (ids.has(charge.id) || names.has(nameKey)) return null;
    ids.add(charge.id);
    names.add(nameKey);

    const standard = standardDefinitions.get(charge.id);
    const legacyBiltyField = charge.legacyBiltyField;
    const legacyBillField = charge.legacyBillField;
    if (
      (legacyBiltyField !== undefined && legacyBiltyField !== standard?.legacyBiltyField) ||
      (legacyBillField !== undefined && legacyBillField !== standard?.legacyBillField)
    ) return null;

    definitions.push({
      id: charge.id,
      name: charge.name.trim(),
      defaultAmount: typeof charge.defaultAmount === "number" ? charge.defaultAmount : null,
      includeOnBilty: charge.includeOnBilty,
      includeOnBill: charge.includeOnBill,
      ...(standard?.legacyBiltyField ? { legacyBiltyField: standard.legacyBiltyField } : {}),
      ...(standard?.legacyBillField ? { legacyBillField: standard.legacyBillField } : {}),
    });
  }
  return definitions;
}

function validateSettings(value: unknown): { values?: CompanySettingsValues; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Settings must be submitted as an object" };
  }

  const body = value as Record<string, unknown>;
  const settings = { ...DEFAULT_COMPANY_SETTINGS, fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY } };

  for (const key of Object.keys(settings) as (keyof CompanySettingsValues)[]) {
    const fieldValue = body[key];
    if (fieldValue === undefined) continue;
    if (key === "lrFormat") {
      if (!isLRFormat(fieldValue)) {
        return { error: "Select a valid LR format" };
      }
      settings.lrFormat = fieldValue;
      continue;
    }
    if (key === "fieldVisibility") {
      if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue)) {
        return { error: "Document visibility must be submitted as an object" };
      }
      const visibility = fieldValue as Record<string, unknown>;
      for (const visibilityKey of COMPANY_FIELD_VISIBILITY_KEYS) {
        const flag = visibility[visibilityKey];
        if (flag !== undefined && typeof flag !== "boolean") {
          return { error: `Visibility for ${visibilityKey} must be on or off` };
        }
        if (typeof flag === "boolean") settings.fieldVisibility[visibilityKey] = flag;
      }
      continue;
    }
    if (key === "lrFormatBackgrounds") {
      if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue)) {
        return { error: "LR format backgrounds must be submitted as an object" };
      }
      const backgrounds = fieldValue as Record<string, unknown>;
      for (const format of LR_FORMATS) {
        const background = backgrounds[format];
        if (!background || typeof background !== "object" || Array.isArray(background)) {
          return { error: `Background settings for ${format} are invalid` };
        }
        const values = background as Record<string, unknown>;
        const backgroundColor = values.backgroundColor;
        const backgroundImage = values.backgroundImage;
        if (typeof backgroundColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(backgroundColor)) {
          return { error: `Choose a valid background color for ${format}` };
        }
        if (typeof backgroundImage !== "string" || !validateImage(backgroundImage)) {
          return { error: `Background image for ${format} must be a real PNG, JPEG, or WebP image no larger than 256 KB` };
        }
        settings.lrFormatBackgrounds[format] = {
          backgroundColor: backgroundColor.toLowerCase(),
          backgroundImage,
        };
      }
      continue;
    }
    if (key === "consignmentStartNumber") {
      if (
        typeof fieldValue !== "number" ||
        !Number.isSafeInteger(fieldValue) ||
        fieldValue < 1 ||
        fieldValue > 999999999999
      ) {
        return { error: "Consignment starting number must be a positive whole number" };
      }
      settings[key] = fieldValue;
      continue;
    }
    if (key === "chargeDefinitions") {
      const definitions = validateChargeDefinitions(fieldValue);
      if (!definitions) {
        return { error: "Charges must have unique names and IDs, valid default amounts, and no more than 40 entries" };
      }
      settings.chargeDefinitions = definitions;
      continue;
    }

    if (typeof fieldValue !== "string") {
      return { error: `${key} must be text` };
    }
    Object.assign(settings, { [key]: fieldValue.trim() });
  }

  const requiredFields: (keyof CompanySettingsValues)[] = [
    "companyName",
  ];
  for (const field of requiredFields) {
    if (!settings[field]) return { error: `${field} is required` };
  }

  if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
    return { error: "Enter a valid company email address" };
  }
  for (const [field, label] of [["mobile1", "Phone"], ["mobile2", "Alternate phone"]] as const) {
    if (settings[field] && !/^\+?[0-9\s()-]{7,20}$/.test(settings[field])) {
      return { error: `${label} must be a valid phone number` };
    }
  }
  if (
    settings.website &&
    !/^https?:\/\/[^/\s]+(?:\/\S*)?$/i.test(settings.website)
  ) {
    return { error: "Company website must start with http:// or https://" };
  }
  if (
    settings.gstNumber &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(settings.gstNumber.toUpperCase())
  ) {
    return { error: "GST number must contain 15 valid GSTIN characters" };
  }
  if (settings.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(settings.panNumber.toUpperCase())) {
    return { error: "PAN must be 10 characters in the format ABCDE1234F" };
  }
  if (!["Current", "Saving", "Others"].includes(settings.accountType)) {
    return { error: "Select a valid account type" };
  }
  if (settings.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(settings.ifscCode.toUpperCase())) {
    return { error: "Enter a valid IFSC code" };
  }
  if (settings.upiId && !/^[\w.-]{2,256}@[a-zA-Z][\w.-]{1,63}$/.test(settings.upiId)) {
    return { error: "Enter a valid UPI ID" };
  }

  for (const [field, maxLength] of Object.entries(TEXT_LIMITS) as [keyof CompanySettingsValues, number][]) {
    const fieldValue = settings[field];
    if (typeof fieldValue === "string" && fieldValue.length > maxLength) {
      return { error: `${field} must be at most ${maxLength} characters` };
    }
  }
  for (const field of IMAGE_FIELDS) {
    if (!validateImage(settings[field])) {
      return {
        error: `${field} must be a real PNG, JPEG, or WebP image no larger than 256 KB`,
      };
    }
  }

  settings.gstNumber = settings.gstNumber.toUpperCase();
  settings.panNumber = settings.panNumber.toUpperCase();
  settings.ifscCode = settings.ifscCode.toUpperCase();
  settings.email = settings.email.toLowerCase();
  return { values: settings };
}

export async function GET() {
  try {
    const ownerId = await getAuthenticatedCompanyId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const data = await loadCompanySettings(ownerId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error loading company settings:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load company settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const ownerId = await getAuthenticatedCompanyId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateSettings(body);
    if (!validation.values) {
      return NextResponse.json(
        { success: false, message: validation.error ?? "Invalid settings" },
        { status: 400 }
      );
    }

    await dbConnect();
    await removeLegacyCompanyIdIndex();
    const savedSettings = await CompanySettings.findOneAndUpdate(
      { ownerId },
      { $set: validation.values, $setOnInsert: { ownerId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )
      .select("-_id -ownerId -createdAt -updatedAt -__v")
      .lean();

    if (!savedSettings) {
      throw new Error("Company settings could not be saved");
    }

    return NextResponse.json({
      success: true,
      message: "Company settings saved",
      data: savedSettings,
    });
  } catch (error) {
    console.error("Error saving company settings:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save company settings" },
      { status: 500 }
    );
  }
}
