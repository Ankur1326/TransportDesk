/**
 * Lorry Hire Contract (LHC) — shared constants.
 *
 * Browser-safe: no mongoose / server-only imports, so forms, API routes and the
 * print sheet can all import from here.
 */
import { PAYMENT_MODES, type PaymentMode } from "@/lib/ledger/payment-modes";

export { PAYMENT_MODES, type PaymentMode };

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Who we hire the truck from. */
export const SUPPLIER_TYPES = ["Broker", "Owner"] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const LOAD_TYPES = ["Full Load", "Part Load"] as const;
export type LorryHireLoadType = (typeof LOAD_TYPES)[number];

/** How basic freight is worked out. "Fixed" means `rate` IS the freight. */
export const RATE_MODES = ["Fixed", "Per Tonne", "Per Kg", "Per Package"] as const;
export type RateMode = (typeof RATE_MODES)[number];

/** Informational: who ultimately bears the freight on the trip. */
export const FREIGHT_PAID_BY = ["Consignor", "Consignee", "Transporter"] as const;
export type FreightPaidBy = (typeof FREIGHT_PAID_BY)[number];

/** Capacity / weight units. Matches the units already shown in the hiring form. */
export const WEIGHT_UNITS = ["KGS", "MTS"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const CHARGE_KINDS = ["add", "deduct"] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];

export const GST_MODES = ["None", "GST", "RCM"] as const;
export type GstMode = (typeof GST_MODES)[number];
export const GST_RATE_OPTIONS = [0, 5, 12, 18] as const;
/** Reverse-charge GTA freight GST is a flat 5%. */
export const RCM_RATE = 5;

export const TDS_MODES = ["Deduction", "Addition"] as const;
export type TdsMode = (typeof TDS_MODES)[number];
export const TDS_RATE_OPTIONS = [0, 0.1, 1, 2, 5, 10, 20] as const;
export const TDS_SECTIONS = ["194C", "Other"] as const;
export type TdsSection = (typeof TDS_SECTIONS)[number];

export const PAYMENT_KINDS = ["Advance", "Part", "Final"] as const;
export type LorryHirePaymentKind = (typeof PAYMENT_KINDS)[number];

/** Trip lifecycle. Money status is tracked separately (`paymentStatus`). */
export const LORRY_HIRE_STATUSES = ["Hired", "In Transit", "Delivered", "Cancelled"] as const;
export type LorryHireStatus = (typeof LORRY_HIRE_STATUSES)[number];
export const DEFAULT_LORRY_HIRE_STATUS: LorryHireStatus = "Hired";

export const PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"] as const;
export type LorryHirePaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ─── Numbering ───────────────────────────────────────────────────────────────

/** Printed contract numbers look like "LHC/1624". */
export const LHC_PREFIX = "LHC/";

// ─── Charge presets ──────────────────────────────────────────────────────────

export interface LorryChargePreset {
  id: string;
  name: string;
  kind: ChargeKind;
}

/**
 * One-tap charge lines offered in the form. Additions raise what we pay the
 * supplier; deductions are recovered from them. (Phase 5 lets a company edit
 * this list in Settings.)
 */
export const DEFAULT_LORRY_CHARGE_PRESETS: readonly LorryChargePreset[] = [
  { id: "halting", name: "Halting Charge", kind: "add" },
  { id: "extra", name: "Extra Charge", kind: "add" },
  { id: "commission", name: "Commission Charge", kind: "deduct" },
  { id: "bilty", name: "Bilty Charge", kind: "deduct" },
  { id: "loading", name: "Loading Charge", kind: "deduct" },
  { id: "custom", name: "Custom Charge", kind: "deduct" },
  { id: "labour", name: "Labour Charge", kind: "deduct" },
  { id: "other", name: "Other Charges", kind: "deduct" },
];

// ─── Input formats ───────────────────────────────────────────────────────────

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** Standard plates, e.g. MH23AU6718, GJ6AB1234, DL1CAB1234. */
const STANDARD_VEHICLE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
/** Bharat series, e.g. 22BH1234AA. */
const BH_VEHICLE_REGEX = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

/** "mh-23 au 6718" -> "MH23AU6718". */
export const normalizeVehicleNumber = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const isValidVehicleNumber = (value: string): boolean => {
  const v = normalizeVehicleNumber(value);
  return STANDARD_VEHICLE_REGEX.test(v) || BH_VEHICLE_REGEX.test(v);
};

/** "MH23AU6718" -> "MH-23-AU-6718" for display. Falls back to the input as typed. */
export const formatVehicleNumber = (value: string): string => {
  const v = normalizeVehicleNumber(value);
  const m = /^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{4})$/.exec(v);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join("-") : value;
};
