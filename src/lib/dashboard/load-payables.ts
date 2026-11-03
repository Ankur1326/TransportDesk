import dbConnect from "@/lib/db";
import { buildPartySnapshot, type PartyLedgerInput } from "@/lib/dashboard/build-ageing";
import { type DashboardRange } from "@/lib/dashboard/shared";
import { payablesPartyMatch } from "@/lib/dashboard/loader-scopes";
import { loadSupplierLedgers } from "@/lib/ledger/load-supplier-ledger";
import type { LedgerSupplier } from "@/lib/ledger/build-supplier-ledger";
import Supplier from "@/models/Supplier";

export async function loadPayables(companyId: string, _range: DashboardRange) {
  void _range;
  await dbConnect();
  const suppliers = await Supplier.find(
    payablesPartyMatch(companyId),
    "name openingBalance balanceType createdAt"
  ).sort({ _id: 1 }).lean();
  const parties: LedgerSupplier[] = suppliers.map((supplier) => ({
    _id: String(supplier._id),
    name: supplier.name,
    openingBalance: supplier.openingBalance ?? 0,
    balanceType: supplier.balanceType ?? "debit",
    createdAt: supplier.createdAt,
  }));
  const ledgers = await loadSupplierLedgers(companyId, parties);
  const input: PartyLedgerInput[] = parties.map((party) => {
    const ledger = ledgers.get(party._id);
    return {
      id: party._id,
      name: party.name,
      net: ledger?.summary.overallNetBalance ?? 0,
      documents: Object.values(ledger?.billStatuses ?? {})
        .filter((bill) => bill.outstanding > 0)
        .map((bill) => ({ billDate: bill.billDate, outstanding: bill.outstanding })),
    };
  });
  return buildPartySnapshot(input, { now: new Date(), partial: false });
}
