/**
 * Pure builders for lorry hire documents (no auth, no DB) — kept apart from
 * server.ts so they can be unit-tested without the app's auth stack.
 */
import type mongoose from "mongoose";
import { computeLorryHireSummary, computePaymentStatus, round2, type LorryHireSummary } from "./calculations";
import type { LorryHireFormValues, LorryHirePaymentValues } from "./validations";

const blank = (v: string | undefined | null): string | undefined => (v ? v : undefined);

/** Fields of the contract that come from the form (no payments, totals or server fields). */
export function buildContractFields(v: LorryHireFormValues, supplierId: mongoose.Types.ObjectId) {
  const supplier = { ...v.supplier, supplierId };
  // "Owner same as supplier" copies the supplier's details so the print sheet needs no special case.
  const owner = v.owner.sameAsSupplier
    ? {
        sameAsSupplier: true,
        name: supplier.name,
        mobile: supplier.mobile,
        pan: supplier.pan,
        address: [supplier.address, supplier.city].filter(Boolean).join(", "),
      }
    : v.owner;

  return {
    lhcNo: v.lhcNo.toUpperCase(),
    lhcDate: v.lhcDate,
    loadingDate: blank(v.loadingDate),
    expectedDeliveryDate: blank(v.expectedDeliveryDate),
    transitDays: v.transitDays,
    loadType: v.loadType,
    from: v.from,
    to: v.to,
    via: v.via,
    supplier,
    owner,
    driver: { ...v.driver, licenseExpiry: blank(v.driver.licenseExpiry) },
    truck: v.truck,
    insurance: { ...v.insurance, validUpto: blank(v.insurance.validUpto) },
    weightUnit: v.weightUnit,
    items: v.items.map((i) => ({
      ...i,
      consignmentId: blank(i.consignmentId),
      cnDate: blank(i.cnDate),
    })),
    freight: v.freight,
    charges: v.charges,
    tax: v.tax,
    shortage: v.shortage,
    bank: v.bank,
    remarks: v.remarks,
    internalNotes: v.internalNotes,
    preparedBy: v.preparedBy,
    passedBy: v.passedBy,
    driverSignature: v.driverSignature,
  };
}

/** Map a computed summary onto the stored `settlement` sub-document. */
export function settlementFrom(s: LorryHireSummary) {
  return {
    totalPackages: s.cargo.packages,
    totalActualWeight: s.cargo.actualWeight,
    totalChargedWeight: s.cargo.chargedWeight,
    freightQuantity: s.quantity,
    basicFreight: s.basicFreight,
    additions: s.additions,
    deductions: s.deductions,
    grossHire: s.grossHire,
    gstAmount: s.gstAmount,
    tdsAmount: s.tdsAmount,
    roundOffAmount: s.roundOffAmount,
    netPayable: s.netPayable,
    totalPaid: s.totalPaid,
    balance: s.balance,
    paymentStatus: s.paymentStatus,
  };
}

/** The slice of a stored contract the settlement maths needs. */
interface StoredForSummary {
  freight: { rateMode: LorryHireFormValues["freight"]["rateMode"]; rate: number };
  weightUnit: LorryHireFormValues["weightUnit"];
  items: { packages: number; actualWeight: number; chargedWeight: number }[];
  charges: { kind: "add" | "deduct"; amount: number }[];
  tax: LorryHireFormValues["tax"];
  shortage: { amount: number };
  payments: { amount: number }[];
}

/** Recompute the summary from a stored (lean) contract. */
export function summarizeStored(h: StoredForSummary): LorryHireSummary {
  return computeLorryHireSummary({
    rateMode: h.freight.rateMode,
    rate: h.freight.rate,
    weightUnit: h.weightUnit,
    items: h.items,
    charges: h.charges,
    gstMode: h.tax.gstMode,
    gstRate: h.tax.gstRate,
    tdsMode: h.tax.tdsMode,
    tdsRate: h.tax.tdsRate,
    roundOff: h.tax.roundOff,
    shortageAmount: h.shortage.amount,
    payments: h.payments,
  });
}

/** totalPaid / balance / paymentStatus from the stored payments, rounded exactly. */
export function paymentTotals(netPayable: number, payments: { amount: number }[]) {
  const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  return {
    totalPaid,
    balance: Math.max(0, round2(netPayable - totalPaid)),
    paymentStatus: computePaymentStatus(netPayable, totalPaid),
  };
}

// ─── Payment mirror (supplier ledger row) ────────────────────────────────────

export function mirrorPaymentDoc(args: {
  companyId: string;
  userId: string;
  ledgerId: mongoose.Types.ObjectId;
  contract: { _id: mongoose.Types.ObjectId | string; lhcNo: string; supplierId: mongoose.Types.ObjectId; supplierName: string };
  payment: Pick<LorryHirePaymentLike, "kind" | "amount" | "date" | "mode" | "reference" | "paidTo" | "remark">;
}) {
  const { payment, contract } = args;
  return {
    _id: args.ledgerId,
    companyId: args.companyId,
    partyType: "supplier" as const,
    partyId: contract.supplierId,
    partyName: contract.supplierName,
    direction: "paid" as const,
    lorryHireId: contract._id,
    lhcNo: contract.lhcNo,
    amount: payment.amount,
    date: new Date(payment.date),
    mode: payment.mode,
    reference: payment.reference ?? "",
    remark: payment.remark || `${payment.kind} payment${payment.paidTo ? ` to ${payment.paidTo}` : ""}`,
    createdBy: args.userId,
  };
}

type LorryHirePaymentLike = Pick<
  LorryHirePaymentValues,
  "kind" | "amount" | "date" | "mode" | "reference" | "paidTo" | "remark"
>;

