/**
 * Lorry hire settlement maths — pure functions, no I/O.
 *
 * Used by the form (live Settlement card), the print sheet and — most
 * importantly — re-run on the server on every save so stored totals can't be
 * tampered with (same approach as `computeBillSummary` for freight bills).
 *
 *   basicFreight = fixed | rate × (tonnes | kg | packages)
 *   grossHire    = basicFreight + Σ additions − Σ deductions        (taxable value)
 *   GST          = grossHire × rate, ADDED to the payable           (mode "GST")
 *                  grossHire × 5%, shown but NOT added — we owe it   (mode "RCM")
 *   TDS          = grossHire × rate, deducted (or added) per tdsMode
 *   net payable  = grossHire + GST ± TDS − shortage, optionally rounded to a rupee
 *   balance      = net payable − Σ payments
 */
import {
  RCM_RATE,
  PAN_REGEX,
  type ChargeKind,
  type GstMode,
  type LorryHirePaymentStatus,
  type RateMode,
  type TdsMode,
  type WeightUnit,
} from "./constants";

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const round3 = (n: number): number => Math.round((n + Number.EPSILON) * 1000) / 1000;

/** Anything numeric-ish -> a finite number, else 0 (handles "", null, undefined, "12abc"). */
export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const nonNegative = (value: unknown): number => Math.max(toNumber(value), 0);

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface HireItemInput {
  packages?: number | string | null;
  actualWeight?: number | string | null;
  chargedWeight?: number | string | null;
}

export interface HireChargeInput {
  kind: ChargeKind;
  amount?: number | string | null;
}

export interface HirePaymentAmount {
  amount?: number | string | null;
}

export interface LorryHireCalcInput {
  rateMode?: RateMode;
  /** For "Fixed" this is the freight itself; otherwise the rate per unit. */
  rate?: number | string | null;
  /** Unit the item weights are entered in. */
  weightUnit?: WeightUnit;
  items?: HireItemInput[];
  charges?: HireChargeInput[];
  gstMode?: GstMode;
  gstRate?: number | string | null;
  tdsMode?: TdsMode;
  tdsRate?: number | string | null;
  roundOff?: boolean;
  shortageAmount?: number | string | null;
  payments?: HirePaymentAmount[];
}

// ─── Cargo totals ────────────────────────────────────────────────────────────

export interface CargoTotals {
  packages: number;
  actualWeight: number;
  chargedWeight: number;
  /** Freight basis per item: charged weight when given, otherwise actual weight (in `weightUnit`). */
  billableWeight: number;
}

export function computeCargoTotals(items: HireItemInput[] = []): CargoTotals {
  let packages = 0;
  let actualWeight = 0;
  let chargedWeight = 0;
  let billableWeight = 0;
  for (const item of items) {
    const actual = nonNegative(item.actualWeight);
    const charged = nonNegative(item.chargedWeight);
    packages += nonNegative(item.packages);
    actualWeight += actual;
    chargedWeight += charged;
    billableWeight += charged > 0 ? charged : actual;
  }
  return {
    packages: round3(packages),
    actualWeight: round3(actualWeight),
    chargedWeight: round3(chargedWeight),
    billableWeight: round3(billableWeight),
  };
}

// ─── Freight ─────────────────────────────────────────────────────────────────

/** Billable quantity for the rate mode (tonnes, kg or packages). 1 for "Fixed". */
export function computeFreightQuantity(
  rateMode: RateMode,
  cargo: CargoTotals,
  weightUnit: WeightUnit = "MTS"
): number {
  switch (rateMode) {
    case "Per Tonne":
      return round3(weightUnit === "MTS" ? cargo.billableWeight : cargo.billableWeight / 1000);
    case "Per Kg":
      return round3(weightUnit === "KGS" ? cargo.billableWeight : cargo.billableWeight * 1000);
    case "Per Package":
      return cargo.packages;
    default:
      return 1;
  }
}

export function computeBasicFreight(input: Pick<LorryHireCalcInput, "rateMode" | "rate" | "weightUnit" | "items">): {
  quantity: number;
  basicFreight: number;
} {
  const rateMode = input.rateMode ?? "Fixed";
  const quantity = computeFreightQuantity(rateMode, computeCargoTotals(input.items), input.weightUnit);
  return { quantity, basicFreight: round2(nonNegative(input.rate) * quantity) };
}

// ─── Settlement ──────────────────────────────────────────────────────────────

export interface LorryHireSummary {
  cargo: CargoTotals;
  quantity: number;
  basicFreight: number;
  additions: number;
  deductions: number;
  /** Basic freight + additions − deductions. Taxable value. Never below 0. */
  grossHire: number;
  gstMode: GstMode;
  gstRate: number;
  gstAmount: number;
  /** GST that actually increases the payable (0 under RCM). */
  gstAdded: number;
  tdsAmount: number;
  /** +tdsAmount for "Addition", −tdsAmount for "Deduction". */
  tdsSigned: number;
  shortage: number;
  roundOffAmount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  /** Paid beyond the net payable (should be 0; flagged by validation). */
  overpaid: number;
  paymentStatus: LorryHirePaymentStatus;
}

export function computePaymentStatus(netPayable: number, totalPaid: number): LorryHirePaymentStatus {
  if (totalPaid <= 0) return "Unpaid";
  return totalPaid >= netPayable ? "Paid" : "Partial";
}

export function computeLorryHireSummary(input: LorryHireCalcInput): LorryHireSummary {
  const cargo = computeCargoTotals(input.items);
  const { quantity, basicFreight } = computeBasicFreight(input);

  let additions = 0;
  let deductions = 0;
  for (const charge of input.charges ?? []) {
    const amount = nonNegative(charge.amount);
    if (charge.kind === "add") additions += amount;
    else deductions += amount;
  }
  additions = round2(additions);
  deductions = round2(deductions);

  const grossHire = Math.max(0, round2(basicFreight + additions - deductions));

  const gstMode = input.gstMode ?? "None";
  const gstRate =
    gstMode === "GST" ? Math.min(nonNegative(input.gstRate), 100) : gstMode === "RCM" ? RCM_RATE : 0;
  const gstAmount = round2((grossHire * gstRate) / 100);
  const gstAdded = gstMode === "GST" ? gstAmount : 0;

  const tdsAmount = round2((grossHire * Math.min(nonNegative(input.tdsRate), 100)) / 100);
  const tdsSigned = input.tdsMode === "Addition" ? tdsAmount : -tdsAmount;

  const shortage = round2(Math.min(nonNegative(input.shortageAmount), grossHire));

  const beforeRound = grossHire + gstAdded + tdsSigned - shortage;
  const rounded = input.roundOff ? Math.round(beforeRound) : round2(beforeRound);
  const netPayable = Math.max(0, rounded);
  const roundOffAmount = round2(rounded - beforeRound);

  const totalPaid = round2((input.payments ?? []).reduce((sum, p) => sum + nonNegative(p.amount), 0));
  const balance = Math.max(0, round2(netPayable - totalPaid));
  const overpaid = Math.max(0, round2(totalPaid - netPayable));

  return {
    cargo,
    quantity,
    basicFreight,
    additions,
    deductions,
    grossHire,
    gstMode,
    gstRate,
    gstAmount,
    gstAdded,
    tdsAmount,
    tdsSigned,
    shortage,
    roundOffAmount,
    netPayable,
    totalPaid,
    balance,
    overpaid,
    paymentStatus: computePaymentStatus(netPayable, totalPaid),
  };
}

// ─── TDS rate suggestion ─────────────────────────────────────────────────────

export interface TdsSuggestion {
  rate: number;
  /** Short, human-readable explanation shown under the field. */
  reason: string;
}

/**
 * Suggests a TDS rate for a payment to a transporter (Section 194C):
 *   - valid declaration of exemption (≤10 goods carriages, PAN given) -> 0%
 *   - PAN of an individual (P) or HUF (H)                              -> 1%
 *   - any other valid PAN (company, firm, AOP, trust, ...)             -> 2%
 *   - no / invalid PAN                                                 -> 20% (higher rate)
 *
 * This is only a suggestion — the user can always override it. It does NOT
 * apply the ₹30,000 per-payment / ₹1,00,000 per-year thresholds; confirm the
 * treatment with your CA.
 */
export function suggestTdsRate(opts: { pan?: string | null; hasDeclaration?: boolean }): TdsSuggestion {
  const pan = (opts.pan ?? "").trim().toUpperCase();
  const validPan = PAN_REGEX.test(pan);

  if (opts.hasDeclaration && validPan) {
    return { rate: 0, reason: "Supplier has given a 194C(6) declaration with PAN — no TDS." };
  }
  if (!validPan) {
    return { rate: 20, reason: pan ? "PAN looks invalid — higher 20% rate applies." : "No PAN on file — higher 20% rate applies." };
  }
  const category = pan[3];
  if (category === "P" || category === "H") {
    return { rate: 1, reason: category === "P" ? "Individual PAN — 1% under 194C." : "HUF PAN — 1% under 194C." };
  }
  return { rate: 2, reason: "Non-individual PAN — 2% under 194C." };
}
