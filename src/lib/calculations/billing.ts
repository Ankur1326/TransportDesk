import type { BillingFormValues } from "@/lib/validations/billing";

export interface ChargeLineItem {
  label: string;
  amount: number;
}

export interface BillingTotals {
  lineItems: ChargeLineItem[];
  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
}

const LEGACY_CHARGE_LABELS: Record<Exclude<keyof BillingFormValues["charges"], "chargeLines">, string> = {
  freight: "Freight",
  localGodownCharges: "Local Godown Charges",
  unloadingCharge: "Unloading Charges",
  loadingCharge: "Loading Charges",
  codCharges: "COD Charges",
  statisticalCharges: "Statistical Charges",
  localCollectionCharges: "Local Collection Charges",
  printHidden: "",
};

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function resolveGstPercentage(tax: BillingFormValues["tax"]): number {
  if (tax.type === "NONE") return 0;
  if (tax.percentage === "custom") return toNumber(tax.customPercentage);
  return toNumber(tax.percentage);
}

/** Computes the full charges → subtotal → GST → grand total breakdown. Pure function, no side effects. */
export function computeBillingTotals(charges: BillingFormValues["charges"], tax: BillingFormValues["tax"]): BillingTotals {
  const snapshotLines: ChargeLineItem[] | null = Array.isArray(charges.chargeLines)
    ? charges.chargeLines.map((line) => ({ label: line.name, amount: toNumber(line.amount) }))
    : null;
  const legacyLines: ChargeLineItem[] = (Object.keys(LEGACY_CHARGE_LABELS) as (keyof typeof LEGACY_CHARGE_LABELS)[])
    .filter((key) => key !== "printHidden")
    .map((key) => ({ label: LEGACY_CHARGE_LABELS[key], amount: toNumber(charges[key]) }));
  const lineItems = snapshotLines ?? legacyLines;

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstPercentage = resolveGstPercentage(tax);
  const gstAmount = tax.type === "NONE" ? 0 : Math.round(((subtotal * gstPercentage) / 100) * 100) / 100;

  const cgstAmount = tax.type === "CGST_SGST" ? Math.round((gstAmount / 2) * 100) / 100 : 0;
  const sgstAmount = tax.type === "CGST_SGST" ? gstAmount - cgstAmount : 0;
  const igstAmount = tax.type === "IGST" ? gstAmount : 0;

  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

  return { lineItems, subtotal, gstPercentage, gstAmount, cgstAmount, sgstAmount, igstAmount, grandTotal };
}