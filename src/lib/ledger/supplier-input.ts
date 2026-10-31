import { z } from "zod";
import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import LorryHireContractModel from "@/models/LorryHireContract";
import { PAYMENT_MODES } from "@/lib/ledger/payment-modes";
import { round2 } from "@/lib/ledger/build-ledger";
import { contractTotalPayable } from "@/lib/ledger/build-supplier-ledger";
import { formatInr } from "@/lib/ledger/format";
import { getContractOutstanding } from "@/lib/ledger/load-supplier-ledger";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");
const money = (max = 1_000_000_000) => z.coerce.number().min(0, "Amount cannot be negative").max(max);

// ─── payments to a supplier ─────────────────────────────────────────────────
const baseFields = {
  amount: z.coerce.number().positive("Amount must be greater than 0").max(1_000_000_000),
  date: dateString,
  mode: z.enum(PAYMENT_MODES).default("Cash"),
  reference: z.string().trim().max(100).default(""),
  remark: z.string().trim().max(500).default(""),
};
const fields = { ...baseFields, contractId: objectId.optional().nullable() };

export const createSupplierPaymentSchema = z.object({
  partyId: objectId,
  direction: z.enum(["paid", "payable_adjustment"]).default("paid"),
  ...fields,
});
export const updateSupplierPaymentSchema = z.object({ _id: objectId, ...fields });
/** One amount split over the supplier's open contracts, oldest first. */
export const allocateSupplierPaymentSchema = z.object({ partyId: objectId, ...baseFields });

/**
 * A payment linked to a contract may not exceed what is still outstanding on it.
 * The extra belongs unlinked, where it stays as an advance (Dr).
 */
export async function contractOutstandingError(
  companyId: string,
  contractId: string,
  amount: number,
  excludePaymentId?: string
): Promise<string | null> {
  const outstanding = await getContractOutstanding(companyId, contractId, excludePaymentId);
  if (outstanding === null) return null; // a missing contract is reported by resolveContractForSupplier
  if (Math.round(round2(amount) * 100) <= Math.round(outstanding * 100)) return null;
  return outstanding <= 0
    ? "This contract is already fully paid. Record the amount without a contract to keep it as an advance."
    : `This contract has only ${formatInr(outstanding)} outstanding. Record the extra amount without a contract (kept as an advance) or use auto-apply.`;
}

/** The contract's number when it belongs to this company AND this supplier; otherwise an error. */
export async function resolveContractForSupplier(
  companyId: string,
  contractId: string,
  supplierId: string
): Promise<{ ok: true; contractNo: string } | { ok: false; message: string }> {
  const contract = await LorryHireContractModel.findOne(
    { $and: [companyFilter(companyId), { _id: contractId, supplierId }] },
    "contractNo"
  ).lean<{ contractNo: string } | null>();
  return contract ? { ok: true, contractNo: contract.contractNo } : { ok: false, message: "Contract not found for this supplier." };
}

// ─── lorry hire contracts ───────────────────────────────────────────────────
const contractFields = {
  contractNo: z.string().trim().min(1, "Contract number is required").max(50),
  date: dateString,
  vehicleNo: z.string().trim().max(20).default(""),
  consignmentNos: z
    .array(z.string().trim().min(1).max(50))
    .max(100)
    .default([])
    .transform((list) => [...new Set(list)]),
  hireAmount: z.coerce.number().positive("Hire amount must be greater than 0").max(1_000_000_000),
  otherCharges: money().default(0),
  deductions: money().default(0),
  tdsAmount: money().default(0),
  advancePaid: money().default(0),
  advanceDate: z.string().optional().default(""),
  advanceVia: z.enum(PAYMENT_MODES).optional(),
  remark: z.string().trim().max(500).default(""),
};

type ContractInput = {
  hireAmount: number;
  otherCharges: number;
  deductions: number;
  tdsAmount: number;
  advancePaid: number;
};

/** Cross-field rules, shared by create and update. */
const contractRules = (v: ContractInput, ctx: z.RefinementCtx) => {
  const total = contractTotalPayable(v);
  if (total <= 0) ctx.addIssue({ code: "custom", message: "Total payable must be greater than 0", path: ["hireAmount"] });
  if (Math.round(v.advancePaid * 100) > Math.round(total * 100)) {
    ctx.addIssue({ code: "custom", message: "Advance cannot be more than the total payable", path: ["advancePaid"] });
  }
};

export const createContractSchema = z.object({ supplierId: objectId, ...contractFields }).superRefine(contractRules);
export const updateContractSchema = z.object({ _id: objectId, ...contractFields }).superRefine(contractRules);
export const deleteContractSchema = z.object({ _id: objectId });
