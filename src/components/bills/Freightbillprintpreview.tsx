"use client";

import { FreightBillHeader } from "@/components/bills/Freightbillheader";
import { useFormContext, useWatch } from "react-hook-form";
import { amountInWords, BillItemValues, computeBillSummary, computeBillTotals, type FreightBillFormValues } from "@/lib/bill/validations";
import { PrintItemsTable } from "@/components/bills/PrintItemsTable";
import formatDate from "@/lib/formateDate";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";

interface FreightBillPrintPreviewProps {
    onClose: () => void;
}

export function FreightBillPrintPreview({ onClose }: FreightBillPrintPreviewProps) {
    const { control } = useFormContext<FreightBillFormValues>();
    const values = useWatch({ control });
    const { settings } = useCompanySettings();
    const items = values.items ?? [];
    const totals = computeBillTotals(items as never);
    const summary = computeBillSummary(totals.totalCharges, values.adjustments);
    const hasAdjustments = Boolean(values.adjustments) && (
        summary.discount > 0 || summary.gstMode !== "None" || summary.tdsAmount > 0 ||
        summary.roundOffAmount !== 0 || summary.advance > 0
    );
    // Bank details saved on the bill win; older bills fall back to Settings.
    const bank = {
        accountHolderName: values.bankDetails?.accountHolderName || settings.accountHolderName,
        bankName: values.bankDetails?.bankName || settings.bankName,
        accountNumber: values.bankDetails?.accountNumber || settings.accountNumber,
        ifscCode: values.bankDetails?.ifscCode || settings.ifscCode,
    };
    const chargeDefinitions = (items as BillItemValues[]).flatMap((item) => item.chargeLines ?? [])
        .reduce<import("@/lib/charges").ChargeDefinition[]>((definitions, line) => {
            if (!definitions.some((definition) => definition.id === line.chargeId)) {
                definitions.push({
                    id: line.chargeId,
                    name: line.name,
                    defaultAmount: null,
                    includeOnBilty: false,
                    includeOnBill: true,
                });
            }
            return definitions;
        }, []);
    const printChargeDefinitions: ChargeDefinition[] = chargeDefinitions.length
        ? chargeDefinitions
        : [
            ...settings.chargeDefinitions.filter((definition) => definition.includeOnBill),
            ...DEFAULT_CHARGE_DEFINITIONS.filter((definition) =>
                definition.legacyBillField &&
                !settings.chargeDefinitions.some((configured) => configured.id === definition.id)
            ),
        ];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-2 print:static print:bg-transparent print:p-0">
            {/* Widened from max-w-3xl — an 11-column table needs real width, both on
          screen and (via the @media print block below) on the printed page. */}
            <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">

                <div className="mb-4 flex justify-end gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="focus-ring rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                        Print
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="focus-ring rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>

                {/* Outer frame — the reference bill is a single bordered box top to
            bottom, not a set of loosely bottom-ruled sections. */}
                <div className="p-1">
                    <FreightBillHeader company={settings} />

                    <div className="grid grid-cols-2 border-x border-slate-900 text-sm">
                        <div className="border-r border-slate-400 p-3">
                            <p className="text-base font-bold uppercase">{values.billedTo?.name}</p>
                            <p className="mt-0.5">{values.billedTo?.address}</p>
                            {values.billedTo?.gstin && (
                                <p className="mt-1.5 font-semibold">GSTIN:- {values.billedTo.gstin}</p>
                            )}
                            {values.hsnCode && <p className="mt-1 font-semibold">HSN/SAC:- {values.hsnCode}</p>}
                        </div>
                        <div className="space-y-1 p-3">
                            {values.billStn && (
                                <p>
                                    <span className="inline-block w-24 font-bold">BILL STN</span> : {values.billStn}
                                </p>
                            )}
                            <p>
                                <span className="inline-block w-24 font-bold">BILL NO</span> : {values.billNo}
                            </p>
                            <p>
                                <span className="inline-block w-24 font-bold">DATE</span> : {formatDate(values.billDate)}
                            </p>
                        </div>
                    </div>

                    <PrintItemsTable items={(items as BillItemValues[]) ?? []} chargeDefinitions={printChargeDefinitions} />

                    {hasAdjustments && (
                        <div className="flex justify-end border-x border-t border-slate-400 border-x-slate-900 px-3 py-2 text-sm">
                            <table className="w-72">
                                <tbody>
                                    <tr><td className="py-0.5">Total Trip Amount</td><td className="py-0.5 text-right">{summary.trip.toFixed(2)}</td></tr>
                                    {summary.discount > 0 && <tr><td className="py-0.5">Discount</td><td className="py-0.5 text-right">- {summary.discount.toFixed(2)}</td></tr>}
                                    {summary.gstMode === "GST" && <tr><td className="py-0.5">GST @ {summary.gstRate}%</td><td className="py-0.5 text-right">+ {summary.gstAmount.toFixed(2)}</td></tr>}
                                    {summary.gstMode === "RCM" && <tr><td className="py-0.5">GST @ {summary.gstRate}% (RCM, payable by recipient)</td><td className="py-0.5 text-right">{summary.gstAmount.toFixed(2)}</td></tr>}
                                    {summary.tdsAmount > 0 && <tr><td className="py-0.5">TDS {summary.tdsSigned < 0 ? "deducted" : "added"}</td><td className="py-0.5 text-right">{summary.tdsSigned < 0 ? "-" : "+"} {summary.tdsAmount.toFixed(2)}</td></tr>}
                                    {summary.roundOffAmount !== 0 && <tr><td className="py-0.5">Round off</td><td className="py-0.5 text-right">{summary.roundOffAmount.toFixed(2)}</td></tr>}
                                    <tr className="border-t border-slate-400 font-bold"><td className="py-0.5">Invoice Amount</td><td className="py-0.5 text-right">{summary.invoiceAmount.toFixed(2)}</td></tr>
                                    {summary.advance > 0 && <tr><td className="py-0.5">Advance received</td><td className="py-0.5 text-right">- {summary.advance.toFixed(2)}</td></tr>}
                                    {summary.advance > 0 && <tr className="font-bold"><td className="py-0.5">Payable Amount</td><td className="py-0.5 text-right">{summary.payable.toFixed(2)}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="border-x border-slate-900 px-3 py-2 text-sm">
                        {summary.gstMode !== "GST" && (
                            <p>
                                GST on Reverse Charge To be paid by: {values.billedTo?.name}{"  "}
                                {values.billedTo?.gstin ? `(${values.billedTo.gstin})` : ""}
                            </p>
                        )}
                        <p className="mt-1 font-semibold">Amount in words :- {amountInWords(summary.invoiceAmount)}</p>
                    </div>

                    <div className="grid grid-cols-2 border-t border-t-slate-400 border-x border-x-slate-900 text-sm">
                        <div className="space-y-1 p-3">
                            <p><span className="inline-block w-32 font-bold">Company Name</span>{settings.companyName.trim() || "Your Company"}</p>
                            {bank.accountHolderName && <p><span className="inline-block w-32 font-bold">Account Holder</span>{bank.accountHolderName}</p>}
                            {bank.bankName && <p><span className="inline-block w-32 font-bold">Bank Name</span>{bank.bankName}</p>}
                            {bank.accountNumber && <p><span className="inline-block w-32 font-bold">A/c No</span>{bank.accountNumber}</p>}
                            {bank.ifscCode && <p><span className="inline-block w-32 font-bold">IFSC</span>{bank.ifscCode}</p>}
                            {settings.bankBranch && <p><span className="inline-block w-32 font-bold">Bank Branch</span>{settings.bankBranch}</p>}
                            {settings.upiId && <p><span className="inline-block w-32 font-bold">UPI ID</span>{settings.upiId}</p>}
                        </div>
                        <div className="flex flex-col items-end justify-between p-3 text-right">
                            {settings.upiQrCode && <img src={settings.upiQrCode} alt="UPI payment QR code" className="h-24 w-24 object-contain" />}
                            {settings.signature && <img src={settings.signature} alt="Authorized signature" className="max-h-16 max-w-40 object-contain" />}
                            <strong>For, {settings.companyName.trim() || "Your Company"}</strong>
                        </div>
                    </div>

                    {settings.invoiceTerms && (
                        <div className="border-x border-slate-900 px-3 py-2 text-xs whitespace-pre-wrap">
                            <strong>Terms and Conditions</strong>
                            <p className="mt-1">{settings.invoiceTerms}</p>
                        </div>
                    )}

                    {values.vehicleNumber && (
                        <p className={`border-t border-t-slate-400 border-x border-x-slate-900 px-3 py-2 text-sm border-b ${values.remark ? "border-b-slate-400" : "border-b-slate-900"}`}>Vehicle Number :- {values.vehicleNumber}</p>
                    )}

                    {values.remark && (
                        <p className="border-b border-b-slate-900 border-x border-x-slate-900 px-3 py-2 text-sm">REMARK :- {values.remark}</p>
                    )}


                    <style jsx global>{`
                    * {
                        box-sizing: border-box;
                    }

                    @media print {
                        @page {
                            size: A4;
                            margin: 5mm;
                        }
                        html,
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100%;
                            background: white !important;
                        }
                             * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
                    }
                    `}</style>
                </div>

                <div className="flex items-end justify-end p-3 text-[12px] font-semibold">
                    For, {settings.companyName.trim() || "Your Company"}
                </div>
                <div className="flex items-end justify-end px-12  pt-15 pb-52 text-sm">
                    {!settings.signature && "Signature"}
                </div>
            </div>
        </div>
    );
}