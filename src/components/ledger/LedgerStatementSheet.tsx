import { getCompanyDocumentInfo, type CompanySettingsValues } from "@/lib/company-settings";
import type { Statement } from "@/lib/ledger/build-ledger";
import { formatInr, formatLedgerDate } from "@/lib/ledger/format";
import { isIncreaseSide } from "@/lib/ledger/build-ledger";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";

export interface StatementCustomer {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string | null;
}

interface LedgerStatementSheetProps {
  kind: PartyKind;
  company: CompanySettingsValues;
  customer: StatementCustomer;
  statement: Statement;
  /** ISO dates (YYYY-MM-DD) from the filter; empty = open ended. */
  from: string;
  to: string;
  includeUnbilled: boolean;
  generatedOn: string;
}


/**
 * Printable customer statement. A pure function of its props — no hooks — so
 * the server-rendered print page (src/app/(print)/admin/statement/[id]) can
 * feed it straight to headless Chromium, which runs with JavaScript off.
 */
export function LedgerStatementSheet({ kind, company, customer, statement, from, to, includeUnbilled, generatedOn }: LedgerStatementSheetProps) {
  const cfg = PARTY_CONFIG[kind];
  /** Dr / Cr suffix so the sign never depends on colour (or on a minus sign) alone. */
  const balanceText = (n: number) =>
    `${formatInr(n)} ${n > 0 ? cfg.net.positiveCode : n < 0 ? cfg.net.negativeCode : ""}`.trim();
  const info = getCompanyDocumentInfo(company);
  const companyAddress = [company.addressLine, company.city, company.state, company.pinCode, company.country]
    .filter(Boolean)
    .join(", ");
  const customerAddress = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ");
  const period =
    from || to
      ? `${from ? formatLedgerDate(from) : "Beginning"} to ${to ? formatLedgerDate(to) : "Today"}`
      : "All dates";

  return (
    <div className="text-[12px] text-slate-900">
      <style>{`@page { size: A4 portrait; margin: 10mm; }
        .stmt-table thead { display: table-header-group; }
        .stmt-table tr { break-inside: avoid; }
        .stmt-totals { break-inside: avoid; }`}</style>

      <header className="text-center">
        <div className="flex items-center justify-center gap-3">
          {info.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- print sheet: a plain <img> is what Chromium prints
            <img src={info.logo} alt="" className="h-14 w-14 shrink-0 object-contain" />
          )}
          <h1 className="text-[22px] font-bold uppercase tracking-wide">{company.companyName || "Company Name"}</h1>
        </div>
        {companyAddress && <p className="mt-1 font-semibold text-slate-700">{companyAddress}</p>}
        <p className="text-slate-700">
          {info.email && <>E-Mail - {info.email}</>}
          {info.email && info.phones() && "   "}
          {info.phones() && <>Mob. {info.phones()}</>}
        </p>
        {info.identifiers.length > 0 && (
          <p className="mt-1 text-slate-700">
            {info.identifiers.map((item) => `${item.label}: ${item.value}`).join("   ")}
          </p>
        )}
      </header>

      <div className="mt-3 bg-slate-800 px-3 py-1.5 text-center text-sm font-bold tracking-wide text-white">
        STATEMENT OF ACCOUNT{kind === "supplier" ? " (SUPPLIER)" : ""}
      </div>

      <section className="mt-3 flex justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{cfg.singular}</p>
          <p className="text-sm font-bold">{customer.name}</p>
          {customerAddress && <p className="text-slate-700">{customerAddress}</p>}
          {customer.gstin && <p className="text-slate-700">GSTIN: {customer.gstin}</p>}
          {customer.mobile && <p className="text-slate-700">Mob. {customer.mobile}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Period</p>
          <p className="font-semibold">{period}</p>
          <p className="text-slate-600">Generated on {generatedOn}</p>
          {kind === "customer" && !includeUnbilled && <p className="text-slate-600">Unbilled bilties excluded</p>}
        </div>
      </section>

      <table className="stmt-table mt-3 w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] uppercase text-slate-600">
            <th className="border border-slate-300 px-2 py-1.5">Date</th>
            <th className="border border-slate-300 px-2 py-1.5">Particulars</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{cfg.increase.short} ({cfg.increase.code})</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{cfg.decrease.short} ({cfg.decrease.code})</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {(from || statement.broughtForward !== 0) && (
            <tr className="bg-slate-50 font-semibold">
              <td className="border border-slate-300 px-2 py-1">{from ? formatLedgerDate(from) : ""}</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>Brought forward</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{balanceText(statement.broughtForward)}</td>
            </tr>
          )}
          {statement.rows.length === 0 && (
            <tr>
              <td colSpan={5} className="border border-slate-300 px-2 py-4 text-center text-slate-600">
                No entries in this period.
              </td>
            </tr>
          )}
          {statement.rows.map(({ entry, balance }) => {
            const ref = entry.refNo && entry.refNo !== entry.label ? `${entry.type} - ${entry.refNo}` : entry.label;
            const mode = typeof entry.meta.mode === "string" ? entry.meta.mode : "";
            const reference = typeof entry.meta.reference === "string" ? entry.meta.reference : "";
            const detail = [entry.refNo && entry.refNo !== entry.label ? entry.label : "", mode, reference]
              .filter(Boolean)
              .join(" · ");
            return (
              <tr key={entry.id}>
                <td className="whitespace-nowrap border border-slate-300 px-2 py-1">{formatLedgerDate(entry.date)}</td>
                <td className="border border-slate-300 px-2 py-1">
                  <span className="font-semibold">{ref}</span>
                  {detail && <span className="block text-[11px] text-slate-600">{detail}</span>}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right">
                  {isIncreaseSide(entry.side) ? formatInr(entry.amount) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right">
                  {!isIncreaseSide(entry.side) ? formatInr(entry.amount) : ""}
                </td>
                <td className="whitespace-nowrap border border-slate-300 px-2 py-1 text-right">{balanceText(balance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="stmt-totals mt-3 ml-auto w-72 text-[12px]">
        <div className="flex justify-between border-b border-slate-300 py-1">
          <span>Total {cfg.increase.short} ({cfg.increase.code})</span>
          <span className="font-semibold">{formatInr(statement.totalReceivable)}</span>
        </div>
        <div className="flex justify-between border-b border-slate-300 py-1">
          <span>Total {cfg.decrease.short} ({cfg.decrease.code})</span>
          <span className="font-semibold">{formatInr(statement.totalReceived)}</span>
        </div>
        <div className="flex justify-between bg-slate-800 px-2 py-1.5 text-white">
          <span className="font-bold">Closing Balance</span>
          <span className="font-bold">
            {balanceText(statement.closingBalance)}
            {statement.closingBalance > 0 ? ` (${cfg.net.positiveStatus})` : statement.closingBalance < 0 ? ` (${cfg.net.negativeStatus})` : " (Settled)"}
          </span>
        </div>
      </section>

      <p className="mt-6 text-center text-[10px] text-slate-500">
        {kind === "customer"
          ? "Dr = amount the customer owes us · Cr = amount received or advance."
          : "Cr = amount we owe the supplier · Dr = amount we paid or advance paid."}{" "}
        This is a computer-generated statement.
      </p>
    </div>
  );
}
