import type { DeepPartial } from "react-hook-form";
import { amountInWords } from "@/lib/bill/validations";
import { computeLorryHireSummary } from "@/lib/lorry-hire/calculations";
import { formatVehicleNumber } from "@/lib/lorry-hire/constants";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { getCompanyDocumentInfo, type CompanySettingsValues } from "@/lib/company-settings";

/** Anything shaped like the form values — the form, or a stored contract from the API. */
export type LorryHireSheetValues = DeepPartial<LorryHireFormValues>;

/** "2026-10-31T00:00:00.000Z" -> "31/10/2026". Reads the date part so the server's timezone can't shift it. */
const fmtDate = (v?: string | Date | null): string => {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof v === "string" ? v : v.toISOString());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
};
const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString("en-IN");

const Field = ({ label, value }: { label: string; value?: string | number | null }) =>
  value || value === 0 ? (
    <p>
      <span className="inline-block w-24 font-bold">{label}</span>: {value}
    </p>
  ) : null;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t border-slate-400 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">{children}</div>
);

/**
 * The printable lorry hire contract ("Truck Supplier Note"), as a pure function
 * of the contract values and the company settings — no hooks — so the same
 * markup serves the live form preview and the server-rendered sheet that
 * becomes the stored PDF (src/app/(print)/admin/lhc/[id]/page.tsx).
 *
 * `payments` overrides `values.payments` — once a contract exists its payments
 * live on the server, not in the form.
 */
export function LorryHireSheet({
  values,
  settings,
  payments,
}: {
  values: LorryHireSheetValues;
  settings: CompanySettingsValues;
  payments?: { kind?: string; amount?: number; date?: string; mode?: string; reference?: string; paidTo?: string }[];
}) {
  const info = getCompanyDocumentInfo(settings);
  const companyName = settings.companyName.trim() || "Your Company";
  const companyAddress = [settings.addressLine, settings.city, settings.state, settings.pinCode, settings.country].filter(Boolean).join(", ");
  const phones = info.phones(", ");

  const items = (values.items ?? []) as NonNullable<LorryHireSheetValues["items"]>;
  const charges = (values.charges ?? []) as { chargeId?: string; name?: string; kind?: "add" | "deduct"; amount?: number }[];
  const paid = (payments ?? (values.payments as typeof payments) ?? []).filter((p) => Number(p?.amount) > 0);
  const unit = values.weightUnit ?? "MTS";

  const s = computeLorryHireSummary({
    rateMode: values.freight?.rateMode,
    rate: values.freight?.rate,
    weightUnit: values.weightUnit,
    items: items as never,
    charges: charges as never,
    gstMode: values.tax?.gstMode,
    gstRate: values.tax?.gstRate,
    tdsMode: values.tax?.tdsMode,
    tdsRate: values.tax?.tdsRate,
    roundOff: values.tax?.roundOff,
    shortageAmount: values.shortage?.amount,
    payments: paid,
  });

  const supplier = values.supplier;
  const owner = values.owner;
  const sameOwner = owner?.sameAsSupplier;
  const driver = values.driver;
  const truck = values.truck;
  const bank = values.bank;
  const hasBank = Boolean(bank?.accountNumber || bank?.upiId || bank?.bankName);
  const supplierAddress = [supplier?.address, supplier?.city, supplier?.state, supplier?.pincode].filter(Boolean).join(", ");
  const rateLabel =
    values.freight?.rateMode && values.freight.rateMode !== "Fixed"
      ? `${qty(s.quantity)} × ₹${money(Number(values.freight.rate) || 0)} ${values.freight.rateMode.toLowerCase()}`
      : "Fixed";

  return (
    <div className="lhc-sheet p-1 text-[13px] text-slate-900">
      <div className="border border-slate-900">
        {/* Company header */}
        <div className="px-3 pb-2 pt-2">
          <div className="flex items-center justify-center gap-4">
            {info.logo && <img src={info.logo} alt={`${companyName} logo`} className="h-[64px] w-[64px] shrink-0 object-contain" />}
            <h1 className="text-center text-[24px] font-bold uppercase tracking-wide text-[#EF6711]">{companyName}</h1>
          </div>
          {info.tagline && <p className="text-center text-xs italic text-slate-600">{info.tagline}</p>}
          {companyAddress && <p className="mt-1 text-center text-sm font-semibold text-slate-700">{companyAddress}</p>}
          {(info.email || phones) && (
            <p className="text-center text-sm text-slate-700">
              {info.email && <>E-Mail - <span className="underline">{info.email}</span></>}
              {info.email && phones && "   "}
              {phones && <>Mob. {phones}</>}
            </p>
          )}
          {(info.identifiers.length > 0 || info.website) && (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 text-xs font-semibold text-slate-800">
              <span className="font-normal text-slate-700">{info.website}</span>
              <span className="flex flex-wrap justify-end gap-x-5">
                {info.identifiers.map((i) => (
                  <span key={i.key}>{i.label}: {i.value}</span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-800 px-4 py-1.5 text-center text-base font-bold tracking-wide text-white">
          LORRY HIRE CONTRACT <span className="font-normal opacity-80">· Truck Supplier Note</span>
        </div>

        {/* LHC identity */}
        <div className="grid grid-cols-3 gap-3 border-b border-slate-400 px-3 py-2">
          <p><span className="font-bold">LHC No</span> : <span className="text-base font-bold">{values.lhcNo}</span></p>
          <p><span className="font-bold">LHC Date</span> : {fmtDate(values.lhcDate)}</p>
          <p><span className="font-bold">Loading Date</span> : {fmtDate(values.loadingDate) || "—"}</p>
        </div>

        {/* Route */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-400 px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">From</p>
            <p className="text-base font-bold uppercase">{values.from?.location}</p>
            {values.from?.state && <p className="text-xs text-slate-600">{values.from.state}</p>}
          </div>
          <div className="text-center text-xs text-slate-600">
            <p className="text-lg font-bold">→</p>
            {values.via && <p>via {values.via}</p>}
            {values.loadType && <p className="font-semibold">{values.loadType}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-slate-500">To</p>
            <p className="text-base font-bold uppercase">{values.to?.location}</p>
            {values.to?.state && <p className="text-xs text-slate-600">{values.to.state}</p>}
          </div>
        </div>
        {(values.expectedDeliveryDate || Number(values.transitDays) > 0) && (
          <p className="border-b border-slate-400 px-3 py-1 text-xs">
            {values.expectedDeliveryDate && <><span className="font-bold">Expected delivery</span> : {fmtDate(values.expectedDeliveryDate)}</>}
            {values.expectedDeliveryDate && Number(values.transitDays) > 0 && "   ·   "}
            {Number(values.transitDays) > 0 && <><span className="font-bold">Transit</span> : {values.transitDays} day(s)</>}
          </p>
        )}

        {/* Supplier | Truck & driver */}
        <div className="grid grid-cols-2">
          <div className="space-y-0.5 border-r border-slate-400 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Hired from ({supplier?.supplierType ?? "Broker"})</p>
            <p className="text-base font-bold uppercase">{supplier?.name}</p>
            {supplierAddress && <p>{supplierAddress}</p>}
            <Field label="Mobile" value={supplier?.mobile} />
            <Field label="GSTIN" value={supplier?.gstin} />
            <Field label="PAN" value={supplier?.pan} />
            {!sameOwner && owner?.name && (
              <div className="mt-2 border-t border-dashed border-slate-300 pt-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Truck owner</p>
                <p className="font-semibold">{owner.name}</p>
                {owner.address && <p>{owner.address}</p>}
                <Field label="Mobile" value={owner.mobile} />
                <Field label="PAN" value={owner.pan} />
              </div>
            )}
          </div>
          <div className="space-y-0.5 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Truck &amp; driver</p>
            <p className="text-base font-bold uppercase">{truck?.vehicleNumber ? formatVehicleNumber(truck.vehicleNumber) : ""}</p>
            <Field label="Truck type" value={truck?.truckType} />
            <Field label="Capacity" value={Number(truck?.capacity) > 0 ? `${qty(Number(truck?.capacity))} ${truck?.capacityUnit ?? ""}` : ""} />
            {truck?.isOversize && <p className="font-semibold">Oversize load</p>}
            <Field label="Chassis no." value={truck?.chassisNo} />
            <Field label="Engine no." value={truck?.engineNo} />
            <Field label="Permit no." value={truck?.permitNo} />
            <div className="mt-2 border-t border-dashed border-slate-300 pt-1.5">
              <Field label="Driver" value={driver?.name} />
              <Field label="Mobile" value={driver?.mobile} />
              <Field label="Licence no." value={driver?.licenseNumber} />
              <Field label="Licence upto" value={fmtDate(driver?.licenseExpiry)} />
              {values.insurance?.company && (
                <Field
                  label="Insurance"
                  value={[values.insurance.company, values.insurance.policyNumber, values.insurance.validUpto && `upto ${fmtDate(values.insurance.validUpto)}`].filter(Boolean).join(" · ")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cargo */}
        <SectionTitle>Cargo details</SectionTitle>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-slate-400 bg-slate-50 text-left">
              <th className="w-8 px-2 py-1">#</th>
              <th className="px-2 py-1">LR / CN no.</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Route</th>
              <th className="px-2 py-1">Description</th>
              <th className="px-2 py-1 text-right">Pkgs</th>
              <th className="px-2 py-1 text-right">Actual ({unit})</th>
              <th className="px-2 py-1 text-right">Charged ({unit})</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-2 py-2 text-center text-slate-500">No consignments listed.</td></tr>
            )}
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-200 align-top">
                <td className="px-2 py-1">{i + 1}</td>
                <td className="px-2 py-1 font-semibold">{it?.cnNo}</td>
                <td className="px-2 py-1">{fmtDate(it?.cnDate)}</td>
                <td className="px-2 py-1">{[it?.from, it?.to].filter(Boolean).join(" → ")}</td>
                <td className="px-2 py-1">{it?.description}</td>
                <td className="px-2 py-1 text-right">{qty(Number(it?.packages) || 0)}</td>
                <td className="px-2 py-1 text-right">{qty(Number(it?.actualWeight) || 0)}</td>
                <td className="px-2 py-1 text-right">{qty(Number(it?.chargedWeight) || 0)}</td>
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-400 font-bold">
                <td colSpan={5} className="px-2 py-1 text-right">Total</td>
                <td className="px-2 py-1 text-right">{qty(s.cargo.packages)}</td>
                <td className="px-2 py-1 text-right">{qty(s.cargo.actualWeight)}</td>
                <td className="px-2 py-1 text-right">{qty(s.cargo.chargedWeight)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Hire settlement */}
        <SectionTitle>Hire charges</SectionTitle>
        <div className="grid grid-cols-[1fr_300px]">
          <div className="border-r border-slate-300 p-3 text-xs">
            <p><span className="font-bold">Rate</span> : {rateLabel}</p>
            {values.freight?.freightPaidBy && <p className="mt-0.5"><span className="font-bold">Freight paid by</span> : {values.freight.freightPaidBy}</p>}
            {values.shortage?.note && Number(values.shortage?.amount) > 0 && <p className="mt-0.5"><span className="font-bold">Shortage note</span> : {values.shortage.note}</p>}
            <p className="mt-2 font-semibold">Net payable in words :-</p>
            <p>{amountInWords(s.netPayable)}</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="px-3 py-0.5">Basic freight</td><td className="px-3 py-0.5 text-right">{money(s.basicFreight)}</td></tr>
              {charges.filter((c) => Number(c.amount) > 0).map((c, i) => (
                <tr key={`${c.chargeId}-${i}`}>
                  <td className="px-3 py-0.5">{c.name}</td>
                  <td className="px-3 py-0.5 text-right">{c.kind === "add" ? "+" : "−"} {money(Number(c.amount))}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300 font-semibold"><td className="px-3 py-0.5">Gross hire</td><td className="px-3 py-0.5 text-right">{money(s.grossHire)}</td></tr>
              {s.gstMode === "GST" && <tr><td className="px-3 py-0.5">GST @ {s.gstRate}%</td><td className="px-3 py-0.5 text-right">+ {money(s.gstAmount)}</td></tr>}
              {s.gstMode === "RCM" && <tr><td className="px-3 py-0.5">GST @ {s.gstRate}% (RCM)</td><td className="px-3 py-0.5 text-right">{money(s.gstAmount)}</td></tr>}
              {s.tdsAmount > 0 && (
                <tr><td className="px-3 py-0.5">TDS @ {values.tax?.tdsRate}%</td><td className="px-3 py-0.5 text-right">{s.tdsSigned < 0 ? "−" : "+"} {money(s.tdsAmount)}</td></tr>
              )}
              {s.shortage > 0 && <tr><td className="px-3 py-0.5">Shortage / damage</td><td className="px-3 py-0.5 text-right">− {money(s.shortage)}</td></tr>}
              {s.roundOffAmount !== 0 && <tr><td className="px-3 py-0.5">Round off</td><td className="px-3 py-0.5 text-right">{money(s.roundOffAmount)}</td></tr>}
              <tr className="border-t border-slate-900 text-base font-bold"><td className="px-3 py-1">Net payable</td><td className="px-3 py-1 text-right">₹ {money(s.netPayable)}</td></tr>
              {s.totalPaid > 0 && <tr><td className="px-3 py-0.5">Paid so far</td><td className="px-3 py-0.5 text-right">− {money(s.totalPaid)}</td></tr>}
              <tr className="font-bold"><td className="px-3 py-0.5">Balance</td><td className="px-3 py-0.5 text-right">₹ {money(s.balance)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Payments made */}
        {paid.length > 0 && (
          <>
            <SectionTitle>Payments made</SectionTitle>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-400 bg-slate-50 text-left">
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Mode</th>
                  <th className="px-2 py-1">Reference</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-2 py-1">{fmtDate(p.date)}</td>
                    <td className="px-2 py-1">{p.kind}</td>
                    <td className="px-2 py-1">{p.mode}</td>
                    <td className="px-2 py-1">{p.reference}</td>
                    <td className="px-2 py-1 text-right">{money(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Supplier bank + remarks */}
        {(hasBank || values.remarks) && (
          <div className="grid grid-cols-2 border-t border-slate-400 text-xs">
            <div className="space-y-0.5 border-r border-slate-300 p-3">
              {hasBank && (
                <>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Supplier bank details</p>
                  <Field label="A/c holder" value={bank?.accountHolderName} />
                  <Field label="Bank" value={bank?.bankName} />
                  <Field label="A/c no." value={bank?.accountNumber} />
                  <Field label="IFSC" value={bank?.ifscCode} />
                  <Field label="UPI" value={bank?.upiId} />
                </>
              )}
            </div>
            <div className="p-3">
              {values.remarks && (
                <>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Remarks</p>
                  <p className="whitespace-pre-wrap">{values.remarks}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-3 border-t border-slate-900 px-3 pb-3 pt-2 text-xs">
          <div className="flex min-h-[72px] flex-col justify-end">
            <p className="font-semibold">{values.preparedBy}</p>
            <p className="border-t border-slate-400 pt-0.5 text-slate-600">Prepared by</p>
          </div>
          <div className="flex min-h-[72px] flex-col items-center justify-end text-center">
            {values.driverSignature && <img src={values.driverSignature} alt="Driver signature" className="mb-1 max-h-14 max-w-full object-contain" />}
            <p className="w-full border-t border-slate-400 pt-0.5 text-slate-600">Driver signature{driver?.name ? ` (${driver.name})` : ""}</p>
          </div>
          <div className="flex min-h-[72px] flex-col items-end justify-end text-right">
            {info.signature && <img src={info.signature} alt="Authorized signature" className="mb-1 max-h-14 max-w-40 object-contain" />}
            {values.passedBy && <p className="font-semibold">{values.passedBy}</p>}
            <p className="w-full border-t border-slate-400 pt-0.5 text-slate-600">For, <strong>{companyName}</strong></p>
          </div>
        </div>
      </div>

      <style>{`
        .lhc-sheet, .lhc-sheet * { box-sizing: border-box; }
        .lhc-sheet table { width: 100%; }
        .lhc-sheet tr, .lhc-sheet img { break-inside: avoid; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
