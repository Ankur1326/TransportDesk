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
import PaymentModel from "@/models/Payment";
import SupplierModel from "@/models/Supplier";
import type { LorryHireFormValues } from "./validations";
import { mirrorPaymentDoc } from "./build";

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

/**
 * Verify a picked supplier belongs to the company, or find-or-create one from
 * the typed details. The contract keeps its own snapshot either way.
 */
export async function resolveSupplier(
  companyId: string,
  userId: string,
  s: LorryHireFormValues["supplier"]
): Promise<SupplierResolution> {
  if (s.supplierId) {
    if (!isObjectId(s.supplierId)) return { ok: false, message: "Selected supplier is invalid." };
    const exists = await SupplierModel.exists({ $and: [companyFilter(companyId), { _id: s.supplierId }] });
    return exists
      ? { ok: true, supplierId: new mongoose.Types.ObjectId(s.supplierId) }
      : { ok: false, message: "Selected supplier was not found." };
  }

  await dropLegacyUniqueIndex(SupplierModel, "name");
  const byName = () =>
    SupplierModel.findOne({ $and: [companyFilter(companyId), { name: s.name }] })
      .collation(CI)
      .select("_id")
      .lean();

  const existing = await byName();
  if (existing) return { ok: true, supplierId: existing._id as mongoose.Types.ObjectId };

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
