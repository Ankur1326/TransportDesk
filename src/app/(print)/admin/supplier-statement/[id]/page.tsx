import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import dbConnect from "@/lib/db";
import Supplier from "@/models/Supplier";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { loadCompanySettings } from "@/lib/company-settings-server";
import { isObjectId } from "@/lib/ledger/load-ledger";
import { loadSupplierLedgers } from "@/lib/ledger/load-supplier-ledger";
import { buildStatement } from "@/lib/ledger/build-ledger";
import type { LedgerSupplier } from "@/lib/ledger/build-supplier-ledger";
import { LedgerStatementSheet } from "@/components/ledger/LedgerStatementSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { parseStatementQuery } from "@/lib/ledger/statement-query";

/**
 * Bare, server-rendered supplier statement — NO sidebar or app shell. Same two
 * jobs as /admin/bill/[id]: the page headless Chromium prints for
 * /api/admin/supplier/ledger/[id]/statement (JavaScript is off there), and the
 * ?toolbar=1 fallback when Chromium can't run. Re-checks the session and scopes
 * every query to the signed-in company.
 */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { title: "Supplier statement" };

export default async function SupplierStatementSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  if (!isObjectId(id)) notFound();

  const auth = await requireCompany();
  if (!auth.ok) redirect("/sign-in");

  const range = parseStatementQuery(query);
  if (!range) notFound();

  await dbConnect();
  const [doc, settings] = await Promise.all([
    Supplier.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] }).lean(),
    loadCompanySettings(auth.companyId),
  ]);
  if (!doc) notFound();

  const customer: LedgerSupplier = {
    _id: String(doc._id),
    name: doc.name,
    openingBalance: doc.openingBalance ?? 0,
    balanceType: doc.balanceType ?? "debit",
    createdAt: doc.createdAt,
  };

  // Complete ledger (no date filter): the statement needs everything before
  // `from` to compute the brought-forward balance.
  const ledgers = await loadSupplierLedgers(auth.companyId, [customer]);
  const ledger = ledgers.get(customer._id);
  if (!ledger) notFound();

  const statement = buildStatement(ledger.entries, { from: range.fromDate, to: range.toDate });

  return (
    <div className="bg-white">
      {query.toolbar === "1" && <PrintToolbar title={`Supplier statement ${customer.name}`} />}
      <div className="mx-auto max-w-4xl p-8 print:max-w-none print:p-0">
        <LedgerStatementSheet
          kind="supplier"
          company={settings}
          customer={{
            name: doc.name,
            address: doc.address,
            city: doc.city,
            state: doc.state,
            pincode: doc.pincode,
            gstin: doc.gstin,
            mobile: doc.mobile,
          }}
          statement={statement}
          from={range.from}
          to={range.to}
          includeUnbilled={range.includeUnbilled}
          generatedOn={new Date().toLocaleDateString("en-GB").replaceAll("/", "-")}
        />
      </div>
    </div>
  );
}
