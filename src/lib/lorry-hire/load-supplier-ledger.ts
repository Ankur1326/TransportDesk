import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import LorryHireModel from "@/models/LorryHire";
import SupplierModel from "@/models/Supplier";
import {
  buildSupplierLedger,
  type SupplierLedger,
  type SupplierLedgerContractInput,
} from "@/lib/lorry-hire/supplier-ledger";

interface HireLean {
  _id: mongoose.Types.ObjectId;
  lhcNo: string;
  lhcDate: Date;
  status: string;
  truck?: { vehicleNumber?: string };
  settlement?: { netPayable?: number };
  payments?: {
    _id: mongoose.Types.ObjectId;
    kind: string;
    amount: number;
    date: Date;
    mode?: string;
    reference?: string;
  }[];
}

export interface SupplierLedgerResult {
  supplier: { _id: string; name: string; mobile: string | null; gstin: string };
  ledger: SupplierLedger;
}

/** Company-scoped supplier ledger. Returns null when the supplier isn't found. */
export async function loadSupplierLedger(
  companyId: string,
  supplierId: string,
  now = new Date()
): Promise<SupplierLedgerResult | null> {
  const supplier = await SupplierModel.findOne({
    $and: [companyFilter(companyId), { _id: supplierId }],
  }).lean();
  if (!supplier) return null;

  const hires = (await LorryHireModel.find({
    $and: [companyFilter(companyId), { "supplier.supplierId": supplier._id }],
  })
    .select("lhcNo lhcDate status truck.vehicleNumber settlement.netPayable payments")
    .sort({ lhcDate: 1 })
    .lean()) as unknown as HireLean[];

  const contracts: SupplierLedgerContractInput[] = hires.map((h) => ({
    _id: String(h._id),
    lhcNo: h.lhcNo,
    lhcDate: h.lhcDate.toISOString(),
    status: h.status,
    vehicleNumber: h.truck?.vehicleNumber,
    netPayable: h.settlement?.netPayable ?? 0,
    payments: (h.payments ?? []).map((p) => ({
      _id: String(p._id),
      kind: p.kind,
      amount: p.amount,
      date: p.date.toISOString(),
      mode: p.mode,
      reference: p.reference,
    })),
  }));

  const ledger = buildSupplierLedger({
    now,
    opening: supplier.openingBalance
      ? {
          amount: supplier.openingBalance,
          balanceType: supplier.balanceType === "debit" ? "debit" : "credit",
          date: supplier.createdAt.toISOString(),
        }
      : undefined,
    contracts,
  });

  return {
    supplier: {
      _id: String(supplier._id),
      name: supplier.name,
      mobile: supplier.mobile ?? null,
      gstin: supplier.gstin ?? "",
    },
    ledger,
  };
}
