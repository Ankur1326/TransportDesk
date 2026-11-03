import dbConnect from "@/lib/db";
import { buildPartySnapshot, OVERDUE_AFTER_DAYS, type PartyLedgerInput } from "@/lib/dashboard/build-ageing";
import { type DashboardRange } from "@/lib/dashboard/shared";
import { receivablesPartyMatch } from "@/lib/dashboard/loader-scopes";
import { loadLedgers } from "@/lib/ledger/load-ledger";
import type { LedgerCustomer } from "@/lib/ledger/build-ledger";
import Customer from "@/models/Customer";

export async function loadReceivables(companyId: string, _range: DashboardRange) {
  void _range;
  await dbConnect();
  const customers = await Customer.find(
    receivablesPartyMatch(companyId),
    "name openingBalance balanceType createdAt"
  ).sort({ _id: 1 }).lean();
  const parties: LedgerCustomer[] = customers.map((customer) => ({
    _id: String(customer._id),
    name: customer.name,
    openingBalance: customer.openingBalance ?? 0,
    balanceType: customer.balanceType ?? "debit",
    createdAt: customer.createdAt,
  }));
  const ledgers = await loadLedgers(companyId, parties);
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
  return buildPartySnapshot(input, {
    now: new Date(),
    overdueDocsAfterDays: OVERDUE_AFTER_DAYS,
    partial: false,
  });
}
