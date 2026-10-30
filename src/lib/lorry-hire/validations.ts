/**
 * Lorry hire contract validation (zod). Shared by the form (client) and the
 * API routes (server). Money totals are NEVER taken from the client — the
 * server recomputes them with `computeLorryHireSummary`.
 */
import { z } from "zod";

import {
  CHARGE_KINDS,
  FREIGHT_PAID_BY,
  GST_MODES,
  IFSC_REGEX,
  LOAD_TYPES,
  PAN_REGEX,
  PAYMENT_KINDS,
  PAYMENT_MODES,
  RATE_MODES,
  SUPPLIER_TYPES,
  TDS_MODES,
  TDS_SECTIONS,
  WEIGHT_UNITS,
  isValidVehicleNumber,
  normalizeVehicleNumber,
} from "./constants";
import { computeLorryHireSummary } from "./calculations";

// ─── Primitives ──────────────────────────────────────────────────────────────

const text = (max = 200) => z.string().trim().max(max).optional().or(z.literal("")).default("");
const money = z.coerce.number().finite().nonnegative().max(1_000_000_000).default(0);
const quantity = z.coerce.number().finite().nonnegative().max(1_000_000).default(0);

/** 10 digits, optionally written with a +91 / 91 / 0 prefix or separators. */
export const isValidIndianMobile = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");
  return (
    /^[6-9][0-9]{9}$/.test(digits) ||
    /^91[6-9][0-9]{9}$/.test(digits) ||
    /^0[6-9][0-9]{9}$/.test(digits)
  );
};

const mobile = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .default("")
  .refine((v) => !v || isValidIndianMobile(v), { message: "Enter a valid 10-digit mobile number." });

const pan = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .or(z.literal(""))
  .default("")
  .refine((v) => !v || PAN_REGEX.test(v), { message: "PAN must look like ABCDE1234F." });

const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .max(15)
  .optional()
  .or(z.literal(""))
  .default("");

const pincode = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .default("")
  .refine((v) => !v || /^[0-9]{6}$/.test(v), { message: "PIN code must be 6 digits." });

/** A date typed as text (yyyy-mm-dd or ISO). Kept as a string until the model casts it. */
const dateText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .default("")
  .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), { message: "Enter a valid date." });

const requiredDate = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Enter a valid date." });

/** PNG/JPEG data URL, capped so a signature can't bloat the document. */
const signatureDataUrl = z
  .string()
  .max(350_000, "Signature image is too large.")
  .refine((v) => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v), {
    message: "Signature must be a PNG, JPEG or WebP image.",
  })
  .optional()
  .default("");

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export const lorryHirePlaceSchema = z.object({
  location: z.string().trim().min(1, "Location is required.").max(120),
  state: text(100),
});

export const lorryHireSupplierSchema = z.object({
  /** Set when picked from the Supplier master; the server find-or-creates it when absent. */
  supplierId: z.string().trim().optional().or(z.literal("")).default(""),
  name: z.string().trim().min(1, "Supplier name is required.").max(100),
  supplierType: z.enum(SUPPLIER_TYPES).default("Broker"),
  address: text(300),
  city: text(100),
  state: text(100),
  pincode,
  gstin,
  pan,
  mobile,
});

export const lorryHireOwnerSchema = z.object({
  sameAsSupplier: z.boolean().default(false),
  name: text(100),
  mobile,
  pan,
  address: text(300),
});

export const lorryHireDriverSchema = z.object({
  name: text(100),
  mobile,
  licenseNumber: text(30),
  licenseExpiry: dateText,
});

export const lorryHireTruckSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(1, "Vehicle number is required.")
    .transform(normalizeVehicleNumber)
    .refine(isValidVehicleNumber, { message: "Enter a valid vehicle number, e.g. MH23AU6718." }),
  truckType: text(60),
  capacity: quantity,
  capacityUnit: z.enum(WEIGHT_UNITS).default("MTS"),
  chassisNo: text(40),
  engineNo: text(40),
  permitNo: text(40),
  isOversize: z.boolean().default(false),
});

export const lorryHireInsuranceSchema = z.object({
  company: text(100),
  policyNumber: text(60),
  validUpto: dateText,
});

export const lorryHireItemSchema = z.object({
  /** Present when the row was imported from an LR. */
  consignmentId: z.string().trim().optional().or(z.literal("")).default(""),
  cnNo: z.string().trim().min(1, "CN number is required.").max(40),
  cnDate: dateText,
  from: text(120),
  to: text(120),
  description: text(300),
  packages: quantity,
  actualWeight: quantity,
  chargedWeight: quantity,
});

export const lorryChargeLineSchema = z.object({
  chargeId: z.string().regex(/^[a-z0-9_-]{1,48}$/, "Invalid charge id."),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(CHARGE_KINDS),
  amount: money,
});

export const lorryHireFreightSchema = z.object({
  rateMode: z.enum(RATE_MODES).default("Fixed"),
  /** "Fixed": the freight amount. Otherwise: rate per tonne / kg / package. */
  rate: money,
  freightPaidBy: z.enum(FREIGHT_PAID_BY).default("Transporter"),
});

export const lorryHireTaxSchema = z.object({
  gstMode: z.enum(GST_MODES).default("None"),
  gstRate: z.coerce.number().min(0).max(100).default(0),
  tdsMode: z.enum(TDS_MODES).default("Deduction"),
  tdsRate: z.coerce.number().min(0).max(100).default(0),
  tdsSection: z.enum(TDS_SECTIONS).default("194C"),
  roundOff: z.boolean().default(false),
});

export const lorryHireShortageSchema = z.object({
  amount: money,
  quantity,
  unit: z.enum(WEIGHT_UNITS).default("KGS"),
  note: text(300),
});

export const lorryHireBankSchema = z.object({
  accountHolderName: text(160),
  bankName: text(160),
  accountNumber: text(34),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .default("")
    .refine((v) => !v || IFSC_REGEX.test(v), { message: "IFSC must look like HDFC0001234." }),
  upiId: text(100),
});

export const lorryHirePaymentSchema = z.object({
  /** Existing payment's id when editing; omitted for a new one. */
  paymentId: z.string().trim().optional().or(z.literal("")).default(""),
  kind: z.enum(PAYMENT_KINDS).default("Advance"),
  amount: z.coerce.number().finite().min(0.01, "Amount must be greater than 0.").max(1_000_000_000),
  date: requiredDate,
  mode: z.enum(PAYMENT_MODES).default("Cash"),
  /** UTR / cheque number. */
  reference: text(100),
  /** Who received the money (the "To Whom" box on the paper contract). */
  paidTo: text(100),
  remark: text(500),
});

// ─── Main form ───────────────────────────────────────────────────────────────

const lorryHireBaseSchema = z.object({
  lhcNo: z.string().trim().min(1, "LHC number is required.").max(40),
  lhcDate: requiredDate,
  loadingDate: dateText,
  expectedDeliveryDate: dateText,
  transitDays: z.coerce.number().int().min(0).max(365).default(0),

  loadType: z.enum(LOAD_TYPES).default("Full Load"),
  from: lorryHirePlaceSchema,
  to: lorryHirePlaceSchema,
  via: text(120),

  supplier: lorryHireSupplierSchema,
  owner: lorryHireOwnerSchema.default({}),
  driver: lorryHireDriverSchema.default({}),
  truck: lorryHireTruckSchema,
  insurance: lorryHireInsuranceSchema.default({}),

  /** Unit the items' weights are entered in. */
  weightUnit: z.enum(WEIGHT_UNITS).default("MTS"),
  items: z.array(lorryHireItemSchema).max(50, "A contract can list at most 50 consignments.").default([]),

  freight: lorryHireFreightSchema.default({}),
  charges: z.array(lorryChargeLineSchema).max(20, "Too many charge lines.").default([]),
  tax: lorryHireTaxSchema.default({}),
  shortage: lorryHireShortageSchema.default({}),

  bank: lorryHireBankSchema.default({}),

  remarks: text(1000),
  internalNotes: text(1000),
  preparedBy: text(100),
  passedBy: text(100),
  driverSignature: signatureDataUrl,

  payments: z.array(lorryHirePaymentSchema).max(30, "Too many payments.").default([]),
});

/** Mongo-friendly, but also catches obviously wrong data before it's stored. */
export const lorryHireFormSchema = lorryHireBaseSchema.superRefine((value, ctx) => {
  // Same city on both ends is almost always a typo.
  if (value.from.location.toLowerCase() === value.to.location.toLowerCase() && value.from.state === value.to.state) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to", "location"], message: "From and To can't be the same place." });
  }

  const loading = value.loadingDate ? new Date(value.loadingDate).getTime() : null;
  const delivery = value.expectedDeliveryDate ? new Date(value.expectedDeliveryDate).getTime() : null;
  if (loading !== null && delivery !== null && delivery < loading) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedDeliveryDate"], message: "Delivery date can't be before the loading date." });
  }

  // Duplicate CN numbers on one contract.
  const seen = new Set<string>();
  value.items.forEach((item, index) => {
    const key = item.cnNo.toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "cnNo"], message: "This CN is already on the contract." });
    }
    seen.add(key);
  });

  // A charge id can appear once.
  const chargeIds = new Set<string>();
  value.charges.forEach((charge, index) => {
    if (chargeIds.has(charge.chargeId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["charges", index, "chargeId"], message: "This charge is already added." });
    }
    chargeIds.add(charge.chargeId);
  });

  // Payments can't exceed what we owe.
  const summary = computeLorryHireSummary({
    rateMode: value.freight.rateMode,
    rate: value.freight.rate,
    weightUnit: value.weightUnit,
    items: value.items,
    charges: value.charges,
    gstMode: value.tax.gstMode,
    gstRate: value.tax.gstRate,
    tdsMode: value.tax.tdsMode,
    tdsRate: value.tax.tdsRate,
    roundOff: value.tax.roundOff,
    shortageAmount: value.shortage.amount,
    payments: value.payments,
  });
  if (summary.overpaid > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payments"],
      message: `Payments exceed the net payable by ₹${summary.overpaid.toFixed(2)}.`,
    });
  }
});

// ─── Types ───────────────────────────────────────────────────────────────────

/** What the form holds / the API accepts (before defaults and transforms). */
export type LorryHireFormInput = z.input<typeof lorryHireFormSchema>;
/** What the server works with after parsing. */
export type LorryHireFormValues = z.output<typeof lorryHireFormSchema>;
export type LorryHireItemValues = z.output<typeof lorryHireItemSchema>;
export type LorryChargeLineValues = z.output<typeof lorryChargeLineSchema>;
export type LorryHirePaymentValues = z.output<typeof lorryHirePaymentSchema>;

/** Convenience: the summary for a parsed (or partially filled) form. */
export function summarizeLorryHireForm(
  value: Pick<LorryHireFormValues, "freight" | "weightUnit" | "items" | "charges" | "tax" | "shortage" | "payments">
) {
  return computeLorryHireSummary({
    rateMode: value.freight.rateMode,
    rate: value.freight.rate,
    weightUnit: value.weightUnit,
    items: value.items,
    charges: value.charges,
    gstMode: value.tax.gstMode,
    gstRate: value.tax.gstRate,
    tdsMode: value.tax.tdsMode,
    tdsRate: value.tax.tdsRate,
    roundOff: value.tax.roundOff,
    shortageAmount: value.shortage.amount,
    payments: value.payments,
  });
}
