import mongoose from "mongoose";
import { companyFilter } from "@/lib/company-scope";
import LorryHireContractModel from "@/models/LorryHireContract";
import PaymentModel from "@/models/Payment";
import type { LedgerOptions, LedgerResult } from "@/lib/ledger/build-ledger";
import {
  buildSupplierLedger,
  computeContractStatuses,
  type LedgerContract,
  type LedgerSupplier,
  type SupplierPayment,
} from "@/lib/ledger/build-supplier-ledger";

interface ContractLean {
  _id: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  contractNo: string;
  date: Date;
  vehicleNo?: string;
  consignmentNos?: string[];
  hireAmount: number;
  otherCharges?: number;
  deductions?: number;
  tdsAmount?: number;
  totalPayable: number;
  advancePaid?: number;
  advanceDate?: string;
  advanceVia?: string;
  remark?: string;
}

interface PaymentLean {
  _id: mongoose.Types.ObjectId;
  partyId: mongoose.Types.ObjectId;
  direction: "paid" | "payable_adjustment";
  contractId?: mongoose.Types.ObjectId;
  contractNo?: string;
  amount: number;
  date: Date;
  mode?: string;
  reference?: string;
  remark?: string;
}

const CONTRACT_FIELDS =
  "supplierId contractNo date vehicleNo consignmentNos hireAmount otherCharges deductions tdsAmount totalPayable advancePaid advanceDate advanceVia remark";
const PAYMENT_FIELDS = "partyId direction contractId contractNo amount date mode reference remark";

const toContract = (c: ContractLean): LedgerContract => ({
  _id: String(c._id),
  contractNo: c.contractNo,
  date: c.date,
  vehicleNo: c.vehicleNo ?? "",
  consignmentNos: c.consignmentNos ?? [],
  hireAmount: c.hireAmount,
  otherCharges: c.otherCharges ?? 0,
  deductions: c.deductions ?? 0,
  tdsAmount: c.tdsAmount ?? 0,
  totalPayable: c.totalPayable,
  advancePaid: c.advancePaid ?? 0,
  advanceDate: c.advanceDate,
  advanceVia: c.advanceVia,
  remark: c.remark,
});

const toPayment = (p: PaymentLean): SupplierPayment => ({
  _id: String(p._id),
  direction: p.direction,
  contractId: p.contractId ? String(p.contractId) : null,
  contractNo: p.contractNo,
  amount: p.amount,
  date: p.date,
  mode: p.mode,
  reference: p.reference,
  remark: p.remark,
});

/**
 * One supplier ledger per supplier using 2 bulk queries (never one per supplier).
 * Every query is filtered by companyId.
 */
export async function loadSupplierLedgers(
  companyId: string,
  suppliers: LedgerSupplier[],
  options: LedgerOptions = {}
): Promise<Map<string, LedgerResult>> {
  const result = new Map<string, LedgerResult>();
  if (suppliers.length === 0) return result;

  const ids = suppliers.map((s) => new mongoose.Types.ObjectId(s._id));
  const scope = companyFilter(companyId);
  const [contracts, payments] = await Promise.all([
    LorryHireContractModel.find({ $and: [scope, { supplierId: { $in: ids } }] }, CONTRACT_FIELDS).lean<ContractLean[]>(),
    PaymentModel.find({ $and: [scope, { partyType: "supplier", partyId: { $in: ids } }] }, PAYMENT_FIELDS).lean<
      PaymentLean[]
    >(),
  ]);

  for (const supplier of suppliers) {
    result.set(
      String(supplier._id),
      buildSupplierLedger({
        supplier,
        contracts: contracts.filter((c) => String(c.supplierId) === String(supplier._id)).map(toContract),
        payments: payments.filter((p) => String(p.partyId) === String(supplier._id)).map(toPayment),
        options,
      })
    );
  }
  return result;
}

/**
 * What is still unpaid on one contract (total - advance - linked paid payments),
 * or null when it isn't one of this company's. `excludePaymentId` leaves one
 * payment out, for editing it.
 */
export async function getContractOutstanding(
  companyId: string,
  contractId: string,
  excludePaymentId?: string
): Promise<number | null> {
  const scope = companyFilter(companyId);
  const contract = await LorryHireContractModel.findOne({ $and: [scope, { _id: contractId }] }, CONTRACT_FIELDS).lean<
    ContractLean | null
  >();
  if (!contract) return null;
  const match: Record<string, unknown> = { contractId, direction: "paid" };
  if (excludePaymentId) match._id = { $ne: excludePaymentId };
  const payments = await PaymentModel.find({ $and: [scope, match] }, PAYMENT_FIELDS).lean<PaymentLean[]>();
  return computeContractStatuses([toContract(contract)], payments.map(toPayment))[String(contract._id)].outstanding;
}
