/**
 * Server-side helpers shared by the lorry hire API routes. Every query is
 * company-scoped; every money total is recomputed here, never read from a client.
 */
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { companyFilter } from "@/lib/company-scope";
import { dropLegacyUniqueIndex } from "@/lib/legacy-indexes";
import ConsignmentModel from "@/models/Consignment";
import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
import SupplierModel from "@/models/Supplier";
import type { LorryHireFormValues } from "./validations";
import { mirrorPaymentDoc, paymentTotals } from "./build";

export * from "./build";

/** Case-insensitive exact matching for names (same as the ledger code). */
const CI = { locale: "en", strength: 2 } as const;

export const isObjectId = (v: unknown): v is string => typeof v === "string" && mongoose.isValidObjectId(v);

export const isDuplicateKey = (error: unknown): boolean =>
  !!error && typeof error === "object" && (error as { code?: number }).code === 11000;

// ─── Supplier master ─────────────────────────────────────────────────────────

export type SupplierResolution =
  | { ok: true; supplierId: mongoose.Types.ObjectId }
  | { ok: false; message: string };

type SupplierBank = NonNullable<LorryHireFormValues["bank"]>;

const hasBank = (b?: SupplierBank): boolean => Boolean(b && (b.accountNumber || b.ifscCode || b.upiId || b.bankName || b.accountHolderName));

/**
 * Verify a picked supplier belongs to the company, or find-or-create one from
 * the typed details. The contract keeps its own snapshot either way.
 *
 * Typed PAN / bank details are also saved on the supplier, so the next contract
 * can pick them up. For a supplier that already exists they only FILL BLANKS —
 * a contract never overwrites what the Suppliers screen holds.
 */
export async function resolveSupplier(
  companyId: string,
  userId: string,
  s: LorryHireFormValues["supplier"],
  bank?: SupplierBank
): Promise<SupplierResolution> {
  const fillBlanks = async (id: mongoose.Types.ObjectId | string) => {
    const doc = await SupplierModel.findOne({ $and: [companyFilter(companyId), { _id: id }] })
      .select("panNumber gstin mobile bankDetails")
      .lean();
    if (!doc) return;
    const set: Record<string, string> = {};
    if (!doc.panNumber && s.pan) set.panNumber = s.pan;
    if (!doc.gstin && s.gstin) set.gstin = s.gstin;
    if (!doc.mobile && s.mobile) set.mobile = s.mobile;
    if (bank) {
      for (const k of ["accountHolderName", "bankName", "accountNumber", "ifscCode", "upiId"] as const) {
        if (!doc.bankDetails?.[k] && bank[k]) set[`bankDetails.${k}`] = bank[k] as string;
      }
    }
    if (Object.keys(set).length > 0) {
      await SupplierModel.updateOne({ $and: [companyFilter(companyId), { _id: id }] }, { $set: set });
    }
  };

  if (s.supplierId) {
    if (!isObjectId(s.supplierId)) return { ok: false, message: "Selected supplier is invalid." };
    const exists = await SupplierModel.exists({ $and: [companyFilter(companyId), { _id: s.supplierId }] });
    if (!exists) return { ok: false, message: "Selected supplier was not found." };
    await fillBlanks(s.supplierId);
    return { ok: true, supplierId: new mongoose.Types.ObjectId(s.supplierId) };
  }

  await dropLegacyUniqueIndex(SupplierModel, "name");
  const byName = () =>
    SupplierModel.findOne({ $and: [companyFilter(companyId), { name: s.name }] })
      .collation(CI)
      .select("_id")
      .lean();

  const existing = await byName();
  if (existing) {
    await fillBlanks(existing._id);
    return { ok: true, supplierId: existing._id as mongoose.Types.ObjectId };
  }

  try {
    const created = await SupplierModel.create({
      name: s.name,
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      gstin: s.gstin,
      mobile: s.mobile || null,
      panNumber: s.pan,
      supplierType: s.supplierType,
      ...(hasBank(bank) ? { bankDetails: bank } : {}),
      companyId,
      createdBy: userId,
    });
    return { ok: true, supplierId: created._id as mongoose.Types.ObjectId };
  } catch (error) {
    // Another request created the same name a moment ago.
    if (isDuplicateKey(error)) {
      const again = await byName();
      if (again) return { ok: true, supplierId: again._id as mongoose.Types.ObjectId };
    }
    throw error;
  }
}

// ─── LR back-references ──────────────────────────────────────────────────────

export const itemConsignmentIds = (items: { consignmentId?: unknown }[]): string[] => [
  ...new Set(items.map((i) => (i.consignmentId ? String(i.consignmentId) : "")).filter(Boolean)),
];

/**
 * Keep `Consignment.lorryHire` in step with the contract's items. Only clears a
 * link that still points at THIS contract, and never bumps `updatedAt` (that
 * would needlessly invalidate cached LR PDFs).
 */
export async function syncConsignmentLinks(
  companyId: string,
  lorryHireId: mongoose.Types.ObjectId | string,
  lhcNo: string,
  nextIds: string[],
  prevIds: string[]
): Promise<void> {
  const removed = prevIds.filter((id) => !nextIds.includes(id));
  if (removed.length > 0) {
    await ConsignmentModel.updateMany(
      { $and: [companyFilter(companyId), { _id: { $in: removed }, "lorryHire.lorryHireId": lorryHireId }] },
      { $unset: { lorryHire: "" } },
      { timestamps: false }
    );
  }
  if (nextIds.length > 0) {
    await ConsignmentModel.updateMany(
      { $and: [companyFilter(companyId), { _id: { $in: nextIds } }] },
      { $set: { lorryHire: { lorryHireId, lhcNo } } },
      { timestamps: false }
    );
  }
}

/**
 * Mirror rows are best-effort: the contract's embedded `payments[]` is what the
 * totals and the supplier ledger read, so a failure here is logged, not fatal.
 */
export async function insertMirrors(docs: ReturnType<typeof mirrorPaymentDoc>[]): Promise<void> {
  if (docs.length === 0) return;
  try {
    await PaymentModel.insertMany(docs);
  } catch (error) {
    console.error("Lorry hire payment mirror failed:", error);
  }
}

/** Keep mirror rows' LHC number / supplier name in step with the contract. */
export async function refreshMirrors(
  companyId: string,
  lorryHireId: mongoose.Types.ObjectId | string,
  fields: { lhcNo: string; partyName: string }
): Promise<void> {
  await PaymentModel.updateMany(
    { $and: [companyFilter(companyId), { lorryHireId }] },
    { $set: { lhcNo: fields.lhcNo, partyName: fields.partyName } }
  );
}

// ─── Responses ───────────────────────────────────────────────────────────────

export const validationFailed = (error: ZodError) =>
  NextResponse.json({ success: false, message: "Validation failed", errors: error.flatten() }, { status: 400 });

export const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

export const DUPLICATE_LHC_MESSAGE = "That LHC number already exists — refresh and try again.";

/** Fields the list / detail APIs never send (large or internal). */
export const LIST_EXCLUDE = "-driverSignature -statusHistory";

// ─── Recording a payment on a contract ───────────────────────────────────────

const paise = (n: number) => Math.round(n * 100);

/** Re-write totalPaid / balance / paymentStatus exactly from the stored payments. */
export async function settleTotals(companyId: string, id: string) {
  const doc = await LorryHireModel.findOne({ $and: [companyFilter(companyId), { _id: id }] })
    .select("settlement.netPayable payments.amount")
    .lean();
  if (!doc) return null;
  const t = paymentTotals(doc.settlement.netPayable, doc.payments);
  return LorryHireModel.findOneAndUpdate(
    { $and: [companyFilter(companyId), { _id: id }] },
    {
      $set: {
        "settlement.totalPaid": t.totalPaid,
        "settlement.balance": t.balance,
        "settlement.paymentStatus": t.paymentStatus,
      },
    },
    { new: true }
  )
    .select(LIST_EXCLUDE)
    .lean();
}

export interface RecordPaymentInput {
  /** Omit to pick automatically: Advance for the first payment, Final when it clears the balance, otherwise Part. */
  kind?: "Advance" | "Part" | "Final";
  amount: number;
  date: string | Date;
  mode: LorryHireFormValues["payments"][number]["mode"];
  reference?: string;
  paidTo?: string;
  remark?: string;
}

export type RecordPaymentResult =
  | { ok: true; data: Awaited<ReturnType<typeof settleTotals>> }
  | { ok: false; status: number; message: string };

/**
 * The ONE way a payment is added to a lorry hire contract — used by the Lorry
 * Hire screen and by the Suppliers ledger, so both always agree.
 *
 * The push is atomic and only applies while the balance still covers the amount,
 * so two simultaneous payments can't overpay the contract.
 */
export async function recordLorryHirePayment(args: {
  companyId: string;
  userId: string;
  lorryHireId: string;
  payment: RecordPaymentInput;
}): Promise<RecordPaymentResult> {
  const { companyId, userId, lorryHireId: id, payment: p } = args;
  const scope = companyFilter(companyId);

  const existing = await LorryHireModel.findOne({ $and: [scope, { _id: id }] })
    .select("status lhcNo supplier settlement payments._id")
    .lean();
  if (!existing) return { ok: false, status: 404, message: "Lorry hire contract not found." };
  if (existing.status === "Cancelled") return { ok: false, status: 409, message: "Payments can't be added to a cancelled contract." };
  if (paise(p.amount) > paise(existing.settlement.balance)) {
    return { ok: false, status: 400, message: `Payment exceeds the balance of ₹${existing.settlement.balance.toFixed(2)}.` };
  }

  const kind =
    p.kind ??
    (paise(p.amount) >= paise(existing.settlement.balance) ? "Final" : existing.payments.length === 0 ? "Advance" : "Part");

  const paymentId = new mongoose.Types.ObjectId();
  const ledgerId = new mongoose.Types.ObjectId();

  const pushed = await LorryHireModel.findOneAndUpdate(
    { $and: [scope, { _id: id, status: { $ne: "Cancelled" }, "settlement.balance": { $gte: p.amount } }] },
    {
      $push: {
        payments: {
          _id: paymentId,
          ledgerPaymentId: ledgerId,
          kind,
          amount: p.amount,
          date: p.date,
          mode: p.mode,
          reference: p.reference ?? "",
          paidTo: p.paidTo ?? "",
          remark: p.remark ?? "",
        },
      },
      $inc: { "settlement.totalPaid": p.amount, "settlement.balance": -p.amount },
    },
    { new: true }
  )
    .select("_id")
    .lean();
  if (!pushed) return { ok: false, status: 409, message: "The balance changed. Refresh and try again." };

  const data = await settleTotals(companyId, id);

  const supplierId = existing.supplier.supplierId;
  if (supplierId) {
    await insertMirrors([
      mirrorPaymentDoc({
        companyId,
        userId,
        ledgerId,
        contract: { _id: id, lhcNo: existing.lhcNo, supplierId, supplierName: existing.supplier.name },
        payment: { kind, amount: p.amount, date: p.date as never, mode: p.mode, reference: p.reference ?? "", paidTo: p.paidTo ?? "", remark: p.remark ?? "" },
      }),
    ]);
  }
  return { ok: true, data };
}
