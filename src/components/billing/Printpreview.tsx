"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "@/components/icons";
import { Button } from "@/components/Button"
import { computeBillingTotals } from "@/lib/calculations/billing";
import { amountToWords } from "@/lib/numberToWords";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getCompanyDocumentInfo, type CompanySettingsValues, type LRFormat } from "@/lib/company-settings";
import { LR_FORMAT_META } from "@/lib/lr-formats";
import type { BillingFormValues } from "@/lib/validations/billing";

interface PrintPreviewProps {
  values: BillingFormValues;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* Copy selection                                                             */
/* -------------------------------------------------------------------------- */

export const ALL_COPY_NAMES = ["LORRY COPY", "CONSIGNEE COPY", "CONSIGNOR COPY", "FILE COPY"] as const;
export type CopyName = (typeof ALL_COPY_NAMES)[number];


const DEFAULT_SELECTED_COPIES: readonly CopyName[] = ["LORRY COPY", "CONSIGNEE COPY"];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

function formatDate(value?: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function rupees(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* -------------------------------------------------------------------------- */
/* Small Components                                                           */
/* -------------------------------------------------------------------------- */

function SmallLabel({ children }: { children: ReactNode }) {
  return <span className="lr-label">{children}</span>;
}

function LRField({ label, value, className = "" }: { label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={`lr-field ${className}`}>
      <SmallLabel>{label}</SmallLabel>
      <span className="lr-field-value">{value || ""}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Single Copy                                                                */
/* -------------------------------------------------------------------------- */



export function LorryCopy({ values, copyName, company, lrFormat }: {
  values: BillingFormValues;
  copyName?: string;            // <- optional label printed on the sheet
  company: CompanySettingsValues;
  lrFormat: LRFormat;
}) {
  const totals = computeBillingTotals(values.charges, values.tax);
  const segment = String(values.segment);
  const companyName = company.companyName.trim() || "Your Company";
  const companyAddress = [
    company.addressLine,
    company.city,
    company.state,
    company.pinCode,
    company.country,
  ].filter(Boolean).join(", ");
  const companyInfo = getCompanyDocumentInfo(company);
  const companyPhones = companyInfo.phones(" / ");
  const background = company.lrFormatBackgrounds[lrFormat];
  return (
    <div
      className={`lr-page lr-format-${lrFormat}`}
      style={{ backgroundColor: background.backgroundColor }}
    >
      {background.backgroundImage && (
        <div
          className="lr-background"
          aria-hidden="true"
          style={{ backgroundImage: `url("${background.backgroundImage}")` }}
        />
      )}
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}
      <div className="lr-header">
        {/* COMPANY INFORMATION */}
        <div className="lr-company-section">
          <div className="lr-company-top">
            <div className="lr-logo">
              {companyInfo.logo ? (
                <img src={companyInfo.logo} alt={`${companyName} logo`} className="h-[60px] w-[60px] object-contain" />
              ) : (
                <span className="text-center text-[10px] font-bold">{companyName.slice(0, 3).toUpperCase()}</span>
              )}
            </div>
            <div className="lr-company-details">
              <div className="lr-company-name !tracking-tight">{companyName}</div>
              {companyInfo.tagline && <div className="text-[11px] font-medium italic leading-tight">{companyInfo.tagline}</div>}
              <div className="text-[13.4px]">
                {companyAddress && (
                  <div className="leading-tight tracking-tighter">
                    <span className="font-semibold">{companyAddress}</span>
                  </div>
                )}
                <div className="leading-tight tracking-tighter">
                  {companyPhones && <span className="font-semibold">Mob.: {companyPhones} </span>}
                  {companyInfo.email && <span className="font-semibold">Email: {companyInfo.email}</span>}
                  {companyInfo.website && <span className="font-semibold"> · {companyInfo.website}</span>}
                </div>
              </div>
            </div>
          </div>
          {companyInfo.identifiers.length > 0 && (
            <div className="lr-registration flex w-full flex-wrap justify-end gap-x-5 px-6">
              {companyInfo.identifiers.map((item) => (
                <div key={item.key} className="flex flex-col">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FROM / TO */}
        <div className="lr-route-section relative">
          <div className="lr-route-row">
            <div className="lr-route-title">FROM</div>
            <div className="lr-route-value">{text(values.from.location)}</div>
          </div>

          <div className="lr-route-row">
            <div className="lr-route-title">TO</div>
            <div className="lr-route-value">{text(values.to.location)}</div>
          </div>

          <div className="lr-delivery-office">
            <SmallLabel>Address of Delivery Office</SmallLabel>
            <div className="lr-handwriting">
              {text(values.to.branch || values.to.location)}
              {values.to.state ? `, ${text(values.to.state)}` : ""}
            </div>
            <div className="lr-mini-row absolute bottom-4 ">
              <span>State :</span>
              <span>{text(values.to.state)}</span>
            </div>
            <div className="lr-mini-row  absolute bottom-1">
              <span>GSTIN :</span>
              <span>{text(values.to.gstin)}</span>
            </div>
          </div>
        </div>

        {/* SEGMENTS */}
        <div className="lr-segment-section">
          <div className="lr-segment-title">SEGMENTS</div>
          {/* "FTL", "LTL", "SUN", "ODC", "MM", "SAARC", "Other" */}
          <div className="lr-segment-options">
            <span className={segment === "FTL" ? "active" : ""}>FTL</span>
            <span className={segment === "LTL" ? "active" : ""}>LTL</span>
            <span className={segment === "SUN" ? "active" : ""}>SUN</span>
            <span className={segment === "ODC" ? "active" : ""}>ODC</span>
            <span className={segment === "MM" ? "active" : ""}>MM</span>
            <span className={segment === "SAARC" ? "active" : ""}>SAARC</span>
            <span className={segment === "Other" ? "active" : ""}>Other</span>
          </div>

          <div className="lr-segment-info">
            <b>Load Type:</b> {text(values.loadType)}
          </div>
          <div className="lr-segment-info">
            <b>Risk:</b> Owner&apos;s Risk
          </div>
          {/* <div className="lr-segment-info">
            <b>Vehicle:</b> {text(values.vehicleNumber)}
          </div> */}
          {/* <div className="lr-segment-info">
            <b>Mode:</b> {text(values.vehicle.transportMode)}
          </div> */}
          <div className="leading-tighter">
            <div className="lr-bank-title lr-segment-title">BANK DETAILS</div>
            <div className="font-semibold tracking-tight text-[12px] pl-1">{companyName}</div>
            {company.accountHolderName && <div className="font-semibold tracking-tight text-[12px] pl-1">A/c Holder: {company.accountHolderName}</div>}
            {company.bankName && <div className="font-semibold tracking-tight text-[12px] pl-1">{company.bankName}{company.bankBranch ? `, ${company.bankBranch}` : ""}</div>}
            {(company.ifscCode || company.accountNumber) && (
              <div className="font-semibold tracking-tight text-[12px] pl-1">
                {company.ifscCode && `IFSC: ${company.ifscCode}`}
                {company.ifscCode && company.accountNumber && " · "}
                {company.accountNumber && `A/c No.: ${company.accountNumber}`}
              </div>
            )}
            {company.upiId && <div className="font-semibold tracking-tight text-[12px] pl-1">UPI: {company.upiId}</div>}
            {company.upiQrCode && <img src={company.upiQrCode} alt="UPI payment QR code" className="ml-1 mt-1 h-12 w-12 object-contain" />}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}
      <div className="lr-content ">
        {/* LEFT / MAIN AREA */}
        <div className="lr-main">
          {/* CONSIGNOR / CONSIGNEE */}
          <div className="lr-parties">
            <div className="lr-party">
              {/* <div className="lr-ack-banner">SPACE FOR ACKNOWLEDGEMENT</div> */}
              {/* <div className="lr-ack-footer"> */}
              {/* <div className="lr-copy-date">Date: {formatDate(values.bookingDate)}</div> */}
              {/* <div className="lr-copy-sign">Signature / Stamp</div> */}
              {/* </div> */}
              <div className="lr-ack-banner">CONSIGNOR</div>
              <div className="lr-party-content">
                <SmallLabel>Address</SmallLabel>
                <div className="lr-party-name">{text(values.consignor.name)}</div>
                <div className="lr-party-address">{text(values.consignor.address)}</div>
                <div className="lr-party-address">
                  {text(values.consignor.city)}
                  {values.consignor.state ? `, ${text(values.consignor.state)}` : ""}
                </div>
                <div className="lr-party-detail !text-[15px] !font-normal">GSTIN: {text(values.consignor.gstin)}</div>
                <div className="lr-party-detail">Mobile: {text(values.consignor.mobile)}</div>
              </div>
            </div>

            <div className="lr-party">
              <div className="lr-ack-banner">CONSIGNEE</div>
              <div className="lr-party-content">
                <SmallLabel>Address</SmallLabel>
                <div className="lr-party-name">{text(values.consignee.name)}</div>
                <div className="lr-party-address">{text(values.consignee.address)}</div>
                <div className="lr-party-address">
                  {text(values.consignee.city)}
                  {values.consignee.state ? `, ${text(values.consignee.state)}` : ""}
                </div>
                <div className="lr-party-detail !text-[15px] !font-normal">GSTIN: {text(values.consignee.gstin)}</div>
                <div className="lr-party-detail">Mobile: {text(values.consignee.mobile)}</div>
              </div>
            </div>
          </div>

          {/* SHIPMENT TABLE */}
          <div className="lr-shipment">
            <div className="lr-shipment-body">
              {/* LEFT COLUMN */}
              <div className="lr-shipment-left">
                {/* Row 1: Pkgs / Packing / Private Mark */}
                <div className="lr-row-one">
                  <div className="lr-row-one-cell">
                    <LRField label="Pkgs." value={text(values.shipment.packages)} />
                  </div>
                  <div className="lr-row-one-cell">
                    <LRField label="Packing" value={text(values.shipment.packing)} />
                  </div>
                  <div className="lr-row-one-cell">
                    <LRField label="Private Mark" value="" />
                  </div>
                </div>

                {/* Row 2: Declared Value / Invoice No. / Volume */}
                <div className="lr-shipment-row row-two">
                  <LRField label="Declared Value" value={text("₹" + values.shipment.declaredValue ? values.shipment.declaredValue : 0)} />
                  <LRField
                    label="Invoice No."
                    value={[text(values.invoiceNumber), values.invoiceDate ? formatDate(values.invoiceDate) : ""]
                      .filter(Boolean)
                      .join("  •  ")}
                  />
                  <LRField label="Volume LxBxH - CFT" value={text(values.shipment.volume)} />
                </div>

                {/* Row 3: E-Way Bill / Valid upto */}
                <div className="lr-shipment-row row-three">
                  <LRField label="E-Way Bill No." value={text(values.eWayBillNumber)} />
                  <LRField label="Valid upto" value={formatDate(values.validUpTo)} />
                </div>

                {/* Terms / Description / Classification */}
                <div className="lr-bottom-row-left">
                  <div className="lr-terms-cell relative">
                    <div className="lr-terms-text ">
                      {company.lrTerms || "We hereby confirm that particulars of goods packed & declared in invoice are same. Packing of the consignment was done under the supervision. We have read the terms & conditions printed on the face & overleaf of the consignment note."}
                    </div>
                    <div className="lr-terms-caption">Description of the goods as declared by Consignor</div>

                    <div className="absolute bottom-0 left-0 w-full flex justify-between items-center px-2 py-1">
                      <div className="lr-copy-sign absolute right-0 bottom-13 w-full text-end pt-32">Consignor&apos;s Signature &nbsp;</div>
                      <div className="lr-copy-date border-t border-black w-full pt-3 absolute bottom-3 left-0">&nbsp; Expected Delivery Date: {values.vehicle.expectedDeliveryDate ? formatDate(values.vehicle.expectedDeliveryDate) : "_____________"}</div>
                    </div>
                  </div>

                  <div className="lr-description-cell">
                    <div className="lr-description-inner">
                      <div className="lr-classification-block">
                        <SmallLabel>Classification of Goods</SmallLabel>
                        <div className="lr-goods-value">{text(values.shipment.classification)}</div>
                      </div>
                      <div className="lr-goods-block">
                        <SmallLabel>Description of Goods</SmallLabel>
                        <div className="lr-goods-value">{text(values.shipment.description)}</div>
                      </div>
                    </div>
                    {copyName && (
                      <div className="lr-copy-name-row">
                        <div className="lr-copy-name">{copyName}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lr-shipment-right">
                <div className="lr-cns-vehicle-top">
                  {/* CNS No. and CNS Date now stacked together in a single column */}
                  <div className="lr-cns-cell">
                    <div className="lr-cns-top">
                      <div className="lr-vertical-title lr-cns-label">CNS NO.</div>
                      <strong className="lr-cns-number">{text(values.consignmentNumber)}</strong>
                    </div>
                    <div className="lr-cns-date-row">
                      <span className="lr-label">CNS Date</span>
                      <strong>{formatDate(values.cnsDate)}</strong>
                    </div>
                  </div>

                  <div className="lr-vehicle-cell">
                    <div className="lr-vertical-title lr-cns-label">VEHICLE NO.</div>
                    <strong className="lr-vehicle-number">{text(values.vehicleNumber)}</strong>
                  </div>
                </div>

                <div className="lr-actual-charged-row">
                  <LRField label="Actual Wt." value={`${text(values.shipment.actualWeight)}`} />
                  <LRField label="Charged Wt. as agreed" value={`${text(values.shipment.chargeWeight)}`} />
                </div>

                <div className="lr-ack-cell">
                  <div className="lr-insurance-row">
                    <div className="lr-field">
                      <SmallLabel>Insurance Company Name &amp; Place</SmallLabel>
                      <span className="lr-field-value">
                        {values.insurance.required
                          ? [text(values.insurance.company), text(values.from.location)].filter(Boolean).join(", ")
                          : "Not Insured"}
                      </span>
                    </div>
                    <div className="lr-field">
                      <SmallLabel>Policy No. &amp; Date</SmallLabel>
                      <span className="lr-field-value">
                        {values.insurance.required
                          ? [text(values.insurance.policyNumber), formatDate(values?.insurance?.date)].filter(Boolean).join("  •  ")
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="lr-ack-banner">SPACE FOR ACKNOWLEDGEMENT</div>
                  <div className="lr-ack-footer">
                    <div className="lr-copy-date">Date: {formatDate(values.bookingDate)}</div>
                    <div className="lr-copy-sign">Signature / Stamp</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CHARGES */}
        <div className="lr-charges">
          {values.charges.printHidden ? (
            <div className="text-center text-[16px] py-22 border-b border-b-black">
              <span>Freight: To be billed</span>
              {/* <span /> */}
            </div>
          ) : (
            <>
              <div className="lr-charge-header">
                <span>Particulars</span>
                <span>Amount in Rs.</span>
              </div>
              {totals.lineItems.map((line, index) => (
                <div className="lr-charge-row" key={`${line.label}-${index}`}>
                  <span>{line.label}</span>
                  <span>{rupees(line.amount)}</span>
                </div>
              ))}
              <div className="lr-charge-row lr-subtotal">
                <strong>SUB TOTAL</strong>
                <strong>{rupees(totals.subtotal)}</strong>
              </div>
              <div className="lr-charge-row">
                <span>GST Charges @ {totals.gstPercentage}%</span>
                <span>{rupees(totals.gstAmount)}</span>
              </div>
              <div className="lr-grand-total">
                <strong>GRAND TOTAL</strong>
                <strong>{rupees(totals.grandTotal)}</strong>
              </div>

              <div className="lr-amount-words">
                <SmallLabel>Amt. in Words</SmallLabel>
                <div>{amountToWords(totals.grandTotal)}</div>
              </div>
            </>
          )}
          {/* <div className="lr-charge-row">
            <span>COD Charges</span>
            <span>{rupees(values.charges.codCharges)}</span>
          </div> */}

          <div className="lr-basis">
            <SmallLabel>Basis of Booking</SmallLabel>
            <div className="lr-checkbox-row">
              <span>{values.payment.type === "To Pay" ? "☑" : "☐"} 1. To Pay</span>
              <span>{values.payment.type === "TBB at" ? "☑" : "☐"} 2. TBB AT WGH</span>
            </div>
            <div className="lr-checkbox-row">
              <span>{values.payment.type === "Paid" ? "☑" : "☐"} 3. Paid</span>
              <span>MR No. ______</span>
            </div>
          </div>

          <div className="lr-gst-payable">
            <SmallLabel>GST Payable by</SmallLabel>
            <div className="lr-checkbox-row">
              <span>{values.payment.billingParty === "Consignor" ? "☑" : "☐"} Consignor</span>
              <span>{values.payment.billingParty === "Consignee" ? "☑" : "☐"} Consignee</span>
              <span>{values.payment.billingParty === "Third Party" ? "☑" : "☐"} UTS</span>
            </div>
          </div>

          <div className="lr-authorized relative">
            <div className="lr-terms-text ">
              {company.lrTerms || "Amount of GST is provisional; actual amount shall be as per received money. Freight is payable by the consignor or consignee at the time of delivery."}
            </div>
            <div className="lr-authorized-space">
              {companyInfo.signature && <img src={companyInfo.signature} alt="Authorized signature" className="ml-auto max-h-14 max-w-36 object-contain" />}
            </div>
            <strong>For {companyName}</strong>
            {/* <div className="lr-authorized-line" /> */}
            <div className="lr-copy-sign absolute left-2 bottom-6 w-full text-start">Signature of Staff___________________</div>

            <div className="lr-copy-sign">Staff Identification No.__________________</div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}
      <div className="lr-footer">
        <div className="lr-footer-text">
          {company.lrTerms || "Goods carried at owner’s risk unless otherwise agreed. Claims are subject to the company’s terms and conditions."}
        </div>
        {copyName && <strong>{copyName}</strong>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PRINT PREVIEW                                                              */
/* -------------------------------------------------------------------------- */

export function PrintPreview({ values, onClose }: PrintPreviewProps) {
  // Which copies the user wants printed — all four are selected by default.
  const [selectedCopies, setSelectedCopies] = useState<Set<CopyName>>(new Set(DEFAULT_SELECTED_COPIES));
  const { settings, isLoading, error, reload } = useCompanySettings();

  function toggleCopy(name: CopyName) {
    setSelectedCopies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedCopies(new Set(ALL_COPY_NAMES));
  }

  function selectNone() {
    setSelectedCopies(new Set());
  }

  const copiesToRender = ALL_COPY_NAMES.filter((name) => selectedCopies.has(name));
  const hasSelection = copiesToRender.length > 0;

  return (
    <div className="lr-preview">
      {/* TOOLBAR — hidden on print */}
      <div className="lr-toolbar print:hidden">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Edit
        </Button>

        {/* COPY SELECTOR — choose which copies get printed */}
        <div className="lr-copy-selector">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800" aria-live="polite">
            {isLoading ? "Loading LR format…" : error ? "LR format unavailable" : `${LR_FORMAT_META[settings.lrFormat].name} format`}
          </span>
          <span className="lr-copy-selector-label">Copies:</span>
          {ALL_COPY_NAMES.map((name) => (
            <label key={name} className="lr-copy-option">
              <input
                type="checkbox"
                checked={selectedCopies.has(name)}
                onChange={() => toggleCopy(name)}
              />
              <span>{name}</span>
            </label>
          ))}
          <button type="button" className="lr-copy-quick-action" onClick={selectAll}>
            All
          </button>
          <button type="button" className="lr-copy-quick-action" onClick={selectNone}>
            None
          </button>
        </div>

        <Button variant="primary" size="sm" onClick={() => window.print()} disabled={!hasSelection || isLoading || Boolean(error)}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      {/* DOCUMENT — only the copies the user selected are rendered / printed */}
      <div className="lr-document">
        {isLoading ? (
          <div className="lr-no-selection print:hidden" role="status">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Loading saved LR format…
          </div>
        ) : error ? (
          <div className="lr-no-selection print:hidden" role="alert">
            <p>Could not load the saved LR format: {error}</p>
            <Button className="mt-3" size="sm" onClick={reload}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : hasSelection ? (
          copiesToRender.map((name) => (
            <LorryCopy
              key={name}
              values={values}
              copyName={name}
              company={settings}
              lrFormat={settings.lrFormat}
            />
            // {/* </div> */}
          ))
        ) : (
          <div className="lr-no-selection print:hidden">
            Select at least one copy above to preview and print it.
          </div>
        )}
      </div>

      <LRStyles />
    </div>
  );
}

/**
 * The LR sheet's stylesheet as a plain <style> tag (not styled-jsx): styled-jsx
 * only injects its CSS on the client in the App Router, and the PDF is rendered
 * from server HTML with JavaScript switched off.
 */
export const LR_CSS = `
        * {
          box-sizing: border-box;
        }

        /* ============================================================= */
        /* PREVIEW SHELL                                                  */
        /* ============================================================= */

        .lr-preview {
          min-height: 100vh;
          background: #e5e7eb;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
        }

        .lr-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          min-height: 60px;
          padding: 10px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #fff;
          border-bottom: 1px solid #d1d5db;
        }

        /* ============================================================= */
        /* COPY SELECTOR                                                  */
        /* ============================================================= */

        .lr-copy-selector {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }

        .lr-copy-selector-label {
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-size: 11px;
        }

        .lr-copy-option {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          color: #26314a;
          cursor: pointer;
          user-select: none;
        }

        .lr-copy-option input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: #16213e;
          cursor: pointer;
        }

        .lr-copy-quick-action {
          border: 1px solid #d1d5db;
          background: #f9fafb;
          color: #374151;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 4px;
          cursor: pointer;
        }

        .lr-copy-quick-action:hover {
          background: #eef0f2;
        }

        .lr-no-selection {
          max-width: 13in;
          margin: 40px auto;
          padding: 24px;
          text-align: center;
          background: #fff;
          border: 1px dashed #9ca3af;
          border-radius: 6px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
        }

        .lr-document {
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* ============================================================= */
        /* PAGE                                                           */
        /* Sized to match the A4 landscape printable area (297mm x       */
        /* 210mm) minus a 5mm margin on every side: 287mm x 200mm.       */
        /* Kept identical on screen so the preview matches the printout. */
        /* ============================================================= */

        .lr-page {
  width: 287mm;
  height: 200mm;
  background: #fff;
  border: 1.5px solid #16213e;
  color: #1a1a2e;
  position: relative;
  font-family: "Segoe UI", Arial, Helvetica, sans-serif;
  font-size: 12.5px;
  line-height: 1.22;
  letter-spacing: 0.2px;
  display: flex;
  flex-direction: column;
}

        .lr-background {
          position: absolute;
          z-index: 0;
          inset: 0;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          opacity: 0.1;
          pointer-events: none;
        }

        .lr-page > :not(.lr-background) {
          position: relative;
          z-index: 1;
        }

        .lr-page.lr-format-modern {
          border-color: #0f766e;
          font-family: Arial, Helvetica, sans-serif;
        }

        .lr-format-modern .lr-header {
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        }

        .lr-format-modern .lr-company-section {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #0f766e;
          background: rgba(204, 251, 241, 0.55);
        }

        .lr-format-modern .lr-company-top {
          align-items: center;
          margin-bottom: 0;
        }

        .lr-format-modern .lr-logo {
          width: 54px;
          height: 54px;
          min-width: 54px;
        }

        .lr-format-modern .lr-registration {
          width: auto;
          margin: 0;
          padding: 0;
        }

        .lr-format-modern .lr-route-section {
          border-right: 1px solid #111;
        }

        .lr-format-modern .lr-segment-section {
          border-right: 0;
        }

        .lr-format-modern .lr-segment-options {
          flex-wrap: wrap;
          gap: 3px;
        }

        .lr-format-modern .lr-content {
          grid-template-columns: 70% 30%;
        }

        .lr-format-modern .lr-company-name,
        .lr-format-modern .lr-party-name,
        .lr-format-modern .lr-segment-info b,
        .lr-format-modern .lr-charge-row > *:last-child,
        .lr-format-modern .lr-amount-words > div:last-child,
        .lr-format-modern .lr-authorized strong {
          color: #0f766e;
        }

        .lr-format-modern .lr-segment-title,
        .lr-format-modern .lr-route-title,
        .lr-format-modern .lr-vertical-title,
        .lr-format-modern .lr-charge-header {
          background-color: #0f766e;
        }

        .lr-format-modern .lr-grand-total {
          background: #0f766e;
        }

        .lr-format-modern .lr-copy-name {
          color: #0f766e;
        }

        /* ---------------------------------------------------------------- */
        /* EXECUTIVE — navy band, gold accents                               */
        /* ---------------------------------------------------------------- */
        .lr-page.lr-format-executive {
          border: 2px solid #0b1f3a;
          font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        }

        .lr-format-executive .lr-header {
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        }

        .lr-format-executive .lr-company-section {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 8px 14px;
          border-right: 0;
          border-bottom: 3px solid #b8893b;
          background: linear-gradient(100deg, #0b1f3a 0%, #15335d 100%);
          color: #e8edf5;
        }

        .lr-format-executive .lr-company-top {
          align-items: center;
          margin-bottom: 0;
        }

        .lr-format-executive .lr-logo {
          width: 58px;
          height: 58px;
          min-width: 58px;
          padding: 3px;
          border-radius: 6px;
          border: 1px solid #b8893b;
          background: #fff;
          color: #0b1f3a;
        }

        .lr-format-executive .lr-company-details *:not(.lr-company-name) {
          color: #e8edf5;
        }

        .lr-format-executive .lr-company-name {
          color: #e6c17a;
          font-size: 22px;
          letter-spacing: 0.8px;
        }

        .lr-format-executive .lr-registration {
          width: auto;
          margin: 0;
          padding: 0;
          color: #e6c17a;
        }

        .lr-format-executive .lr-route-section {
          border-right: 1px solid #0b1f3a;
        }

        .lr-format-executive .lr-route-title {
          background: #f6ecd6;
          color: #0b1f3a;
        }

        .lr-format-executive .lr-segment-section {
          border-right: 0;
        }

        .lr-format-executive .lr-segment-title,
        .lr-format-executive .lr-vertical-title,
        .lr-format-executive .lr-charge-header,
        .lr-format-executive .lr-ack-banner {
          background: #0b1f3a;
          letter-spacing: 1.2px;
        }

        .lr-format-executive .lr-ack-banner {
          border-bottom: 2px solid #b8893b;
        }

        .lr-format-executive .lr-content {
          grid-template-columns: 72% 28%;
        }

        .lr-format-executive .lr-label {
          color: #8a7547;
        }

        .lr-format-executive .lr-party-name,
        .lr-format-executive .lr-route-value,
        .lr-format-executive .lr-charge-row > *:last-child,
        .lr-format-executive .lr-subtotal strong {
          color: #0b1f3a;
        }

        .lr-format-executive .lr-cns-number,
        .lr-format-executive .lr-copy-name {
          color: #9a6f1f;
        }

        .lr-format-executive .lr-segment-options .active {
          color: #9a6f1f;
          text-decoration-color: #b8893b;
        }

        .lr-format-executive .lr-subtotal {
          background: #f6ecd6;
        }

        .lr-format-executive .lr-grand-total {
          background: linear-gradient(90deg, #b8893b, #d9ae5a);
          color: #0b1f3a;
          font-weight: 900;
        }

        /* ---------------------------------------------------------------- */
        /* MINIMAL — hairlines, light headings                               */
        /* ---------------------------------------------------------------- */
        .lr-page.lr-format-minimal {
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-family: "Inter", "Segoe UI", Arial, Helvetica, sans-serif;
          letter-spacing: 0;
        }

        .lr-format-minimal * {
          border-color: #cbd5e1 !important;
        }

        .lr-format-minimal .lr-company-name {
          color: #0f172a;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .lr-format-minimal .lr-segment-title,
        .lr-format-minimal .lr-vertical-title,
        .lr-format-minimal .lr-ack-banner,
        .lr-format-minimal .lr-charge-header {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          letter-spacing: 1.4px;
        }

        .lr-format-minimal .lr-charge-header {
          letter-spacing: 0.4px;
        }

        .lr-format-minimal .lr-registration,
        .lr-format-minimal .lr-registration * {
          color: #475569;
        }

        .lr-format-minimal .lr-route-title {
          color: #64748b;
          letter-spacing: 1.2px;
        }

        .lr-format-minimal .lr-label {
          color: #94a3b8;
        }

        .lr-format-minimal .lr-party-name,
        .lr-format-minimal .lr-route-value,
        .lr-format-minimal .lr-charge-row > *:last-child,
        .lr-format-minimal .lr-subtotal strong {
          color: #0f172a;
        }

        .lr-format-minimal .lr-cns-number {
          color: #0f172a;
        }

        .lr-format-minimal .lr-copy-name {
          color: #475569;
        }

        .lr-format-minimal .lr-segment-options .active {
          padding: 0 6px;
          border-radius: 4px;
          background: #e2e8f0;
          color: #0f172a;
          text-decoration: none;
        }

        .lr-format-minimal .lr-subtotal {
          background: #f8fafc;
        }

        .lr-format-minimal .lr-grand-total {
          background: #0f172a;
          color: #fff;
        }

        /* ---------------------------------------------------------------- */
        /* BOLD — black rules, yellow band, copier-proof                     */
        /* ---------------------------------------------------------------- */
        .lr-page.lr-format-bold {
          border: 3px solid #000;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 600;
          letter-spacing: 0;
        }

        .lr-format-bold * {
          border-color: #000 !important;
        }

        .lr-format-bold .lr-header {
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        }

        .lr-format-bold .lr-company-section {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 12px;
          border-right: 0;
          border-bottom: 3px solid #000;
          background: #facc15;
          color: #000;
        }

        .lr-format-bold .lr-company-top {
          align-items: center;
          margin-bottom: 0;
        }

        .lr-format-bold .lr-logo {
          width: 56px;
          height: 56px;
          min-width: 56px;
          background: #fff;
          border: 2px solid #000;
          color: #000;
        }

        .lr-format-bold .lr-company-name {
          color: #000;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .lr-format-bold .lr-registration {
          width: auto;
          margin: 0;
          padding: 0;
          font-weight: 800;
        }

        .lr-format-bold .lr-registration,
        .lr-format-bold .lr-registration * {
          color: #000;
        }

        .lr-format-bold .lr-route-title {
          background: #000;
          color: #fff;
        }

        .lr-format-bold .lr-segment-section {
          border-right: 0;
        }

        .lr-format-bold .lr-segment-title,
        .lr-format-bold .lr-vertical-title,
        .lr-format-bold .lr-charge-header,
        .lr-format-bold .lr-ack-banner {
          background: #000;
          color: #fff;
        }

        .lr-format-bold .lr-label {
          color: #111;
          font-weight: 800;
        }

        .lr-format-bold .lr-party-name {
          color: #000;
          font-size: 18px;
          font-weight: 900;
        }

        .lr-format-bold .lr-route-value,
        .lr-format-bold .lr-charge-row > *:last-child,
        .lr-format-bold .lr-subtotal strong {
          color: #000;
        }

        .lr-format-bold .lr-cns-number {
          color: #000;
          font-size: 24px;
        }

        .lr-format-bold .lr-copy-name {
          color: #000;
        }

        .lr-format-bold .lr-segment-options .active {
          padding: 0 6px;
          border-radius: 2px;
          background: #000;
          color: #facc15;
          text-decoration: none;
        }

        .lr-format-bold .lr-subtotal {
          background: #fef9c3;
        }

        .lr-format-bold .lr-grand-total {
          background: #facc15;
          border-top: 3px solid #000;
          color: #000;
          font-size: 16px;
          font-weight: 900;
        }

        .lr-page.lr-format-ledger {
          border-color: #7c2d12;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.05px;
        }

        .lr-format-ledger .lr-header {
          grid-template-columns: 60% 40%;
        }

        .lr-format-ledger .lr-company-section {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 4px 10px;
          text-align: center;
          border-bottom: 1px double #7c2d12;
        }

        .lr-format-ledger .lr-company-top {
          align-items: center;
          justify-content: center;
          margin: 0;
        }

        .lr-format-ledger .lr-logo {
          width: 48px;
          height: 48px;
          min-width: 48px;
        }

        .lr-format-ledger .lr-company-name {
          color: #7c2d12;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 18px;
          letter-spacing: 0.25px;
        }

        .lr-format-ledger .lr-registration {
          width: auto;
          margin: 0;
          padding: 0;
          color: #7c2d12;
        }

        .lr-format-ledger .lr-route-section {
          border-right: 1px solid #7c2d12;
        }

        .lr-format-ledger .lr-route-title,
        .lr-format-ledger .lr-segment-title,
        .lr-format-ledger .lr-vertical-title,
        .lr-format-ledger .lr-charge-header {
          background-color: #7c2d12;
          color: #fff;
        }

        .lr-format-ledger .lr-content {
          grid-template-columns: 64% 36%;
        }

        .lr-format-ledger .lr-parties {
          min-height: 1.7in;
        }

        .lr-format-ledger .lr-party {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
        }

        .lr-format-ledger .lr-party .lr-ack-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          padding: 3px 2px;
        }

        .lr-format-ledger .lr-party-content {
          padding: 5px 7px;
        }

        .lr-format-ledger .lr-segment-options .active {
          color: #7c2d12;
        }

        .lr-format-ledger .lr-grand-total {
          background: #7c2d12;
        }

        .lr-format-ledger .lr-company-name,
        .lr-format-ledger .lr-party-name,
        .lr-format-ledger .lr-cns-number,
        .lr-format-ledger .lr-vehicle-number,
        .lr-format-ledger .lr-charge-row > *:last-child,
        .lr-format-ledger .lr-amount-words > div:last-child,
        .lr-format-ledger .lr-authorized strong {
          color: #7c2d12;
        }

        .lr-format-ledger .lr-copy-name {
          color: #7c2d12;
          font-family: Arial, Helvetica, sans-serif;
        }

        .lr-page.lr-format-compact {
          font-size: 11px;
          line-height: 1.12;
          letter-spacing: 0;
        }

        .lr-format-compact .lr-header {
          grid-template-columns: 35% 40% 25%;
        }

        .lr-format-compact .lr-company-section {
          padding: 3px 4px;
        }

        .lr-format-compact .lr-company-name {
          font-size: 16px;
        }

        .lr-format-compact .lr-parties {
          min-height: 1.55in;
        }

        .lr-format-compact .lr-party-name {
          font-size: 14px;
          margin-bottom: 1px;
        }

        .lr-format-compact .lr-party-address {
          font-size: 12px;
          line-height: 1.2;
        }

        .lr-format-compact .lr-party-detail,
        .lr-format-compact .lr-charges {
          font-size: 10.5px;
        }

        .lr-format-compact .lr-label {
          font-size: 8px;
          margin-bottom: 1px;
        }

        .lr-format-compact .lr-charge-row {
          min-height: 16px;
        }

        .lr-format-compact .lr-grand-total {
          min-height: 24px;
          font-size: 12px;
        }

        /* ============================================================= */
        /* HEADER                                                         */
        /* ============================================================= */

        .lr-header {
          display: grid;
          grid-template-columns: 38% 37% 25%;
          border-bottom: 1px solid #111;
        }

        .lr-company-section {
          padding: 5px 6px;
          border-right: 1px solid #111;
        }

        .lr-company-top {
          display: flex;
          gap: 7px;
          margin-bottom: 4px;
        }

        .lr-logo {
          width: 70px;
          height: 110px;
          min-width: 60px;
          overflow: hidden;
          background: #fff;
        }

        .lr-logo img {
          width: 100%;
          height: 100%;
        }

        .lr-company-name {
          color: #EF6711;
          font-size: 19px;
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .lr-company-details {
          font-size: 12px;
          line-height: 1.4;
          color: #3f3f46;
        }

        .lr-company-address {
          margin-bottom: 2px;
        }

        .lr-company-contact {
          margin-bottom: 4px;
          color: #16213e;
          font-weight: 600;
        }

        .lr-registration {
          color: #EF6711;
          font-weight: 700;
          line-height: 1.4;
          font-size: 10.5px;
          margin-bottom: 4px;
          letter-spacing: 0.2px;
        }

        .lr-bank-details {
          font-size: 10.5px;
          line-height: 1.4;
          border-top: 1.5px solid #16213e;
          padding-top: 3px;
          letter-spacing: 0.2px;
          font-weight: 600;
          color: #26314a;
        }

        .lr-bank-title {
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #16213e;
          margin-bottom: 1px;
          font-size: 10.5px;
        }

        /* ============================================================= */
        /* ROUTE                                                          */
        /* ============================================================= */

        .lr-route-section {
          border-right: 1px solid #111;
          font-weight: 600;
          font-size: 13px;
        }

        .lr-route-row {
          height: 30px;
          display: grid;
          grid-template-columns: 52px 1fr;
          border-bottom: 1px solid #111;
          font-weight: 600;
          font-size: 13px;
        }

        .lr-route-title {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #111;
          font-weight: 700;
          font-size: 12.5px;
          letter-spacing: 0.4px;
          color: #000;
        }

        .lr-route-value {
          display: flex;
          align-items: center;
          padding: 0 8px;
          font-size: 17px;
          font-weight: 700;
          color: #16213e;
        }

        .lr-delivery-office {
          padding: 4px 8px;
        }

        .lr-handwriting {
          margin-top: 4px;
          margin-bottom: 3px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .lr-mini-row {
          display: flex;
          gap: 5px;
          margin-top: 2px;
          font-size: 11.5px;
          color: #3f3f46;
        }

        .lr-mini-row span:first-child {
          font-weight: 700;
          color: #16213e;
        }

        /* ============================================================= */
        /* SEGMENTS                                                       */
        /* ============================================================= */

        .lr-segment-section {
          font-size: 11px;
          color: #26314a;
        }

        .lr-segment-title {
          text-align: center;
          font-weight: 900;
          padding: 4px;
          border-bottom: 1px solid #111;
          background: #16213e;
          color: #fff;
          letter-spacing: 0.7px;
          font-size: 11.5px;
        }

        .lr-segment-options {
          display: flex;
          justify-content: space-around;
          padding: 4px 2px;
          border-bottom: 1px solid #111;
          font-weight: 600;
          color: #6b7280;
        }

        .lr-segment-options .active {
          font-weight: 900;
          text-decoration: underline;
          color: #b91c1c;
        }

        .lr-segment-info {
          padding: 3px 6px;
          border-bottom: 1px solid #111;
        }

        .lr-segment-info b {
          color: #16213e;
        }

        /* ============================================================= */
        /* MAIN CONTENT                                                   */
        /* ============================================================= */

        .lr-content {
          flex: 1;
          display: grid;
          grid-template-columns: 75% 25%;
          border-bottom: 1px solid #111;
          min-height: 0;
        }

        .lr-main {
          border-right: 1px solid #111;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* ============================================================= */
        /* PARTIES                                                        */
        /* ============================================================= */

        .lr-parties {
          min-height: 1.95in;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .lr-party {
          border-bottom: 1px solid #111;
          border-right: 1px solid #111;
        }

        .lr-party:last-child {
          border-right: 0;
        }

        .lr-vertical-title {
          width: 24px;
          min-width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 10px;
          font-weight: 900;
          border-right: 1px solid #111;
          letter-spacing: 1px;
          background-color: #16213e;
          color: white;
        }

        .lr-party-content {
          padding: 2px 6px;
          flex: 1;
          min-width: 0;
        }

        .lr-label {
          display: block;
          font-size: 9.5px;
          color: #6b7280;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 2px;
        }

        .lr-party-name {
          font-size: 17px;
          font-weight: 800;
          color: #16213e;
          margin-bottom: 3px;
        }

        .lr-party-address {
          font-size: 15px;
          line-height: 1.35;
          color: #3f3f46;
          margin-bottom: 2px;
        }

        .lr-party-detail {
          font-size: 12px;
          margin-top: 3px;
          color: #26314a;
          font-weight: 600;
        }

        /* ============================================================= */
        /* SHIPMENT                                                       */
        /* ============================================================= */

        .lr-shipment {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .lr-shipment-body {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .lr-shipment-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #111;
        }

        .lr-shipment-right {
          width: 50%;
          min-width: 30%;
          display: flex;
          flex-direction: column;
        }

        .lr-shipment-row {
          display: grid;
          border-bottom: 1px solid #111;
        }

        .lr-shipment-row > * {
          border-right: 1px solid #111;
          padding: 3px 5px;
        }

        .lr-shipment-row > *:last-child {
          border-right: 0;
        }

        .row-two {
          grid-template-columns: 30% 40% 30%;
          min-height: 34px;
        }

        .row-three {
          grid-template-columns: 55% 45%;
          min-height: 34px;
        }

        .lr-field {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .lr-field-value {
          font-size: 13.5px;
          font-weight: 600;
          color: #16213e;
          word-break: break-word;
        }

        /* Row 1 (left column): Pkgs / Packing / Private Mark */
        .lr-row-one {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border-bottom: 1px solid #111;
          min-height: 42px;
        }

        .lr-row-one-cell {
          border-right: 1px solid #111;
          padding: 3px 5px;
          display: flex;
          align-items: center;
        }

        .lr-row-one-cell:last-child {
          border-right: 0;
        }

        /* ============================================================= */
        /* CNS NO. / CNS DATE / VEHICLE NO.                               */
        /* ============================================================= */

        .lr-cns-vehicle-top {
          min-height: 100px;
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid #111;
        }

        .lr-cns-cell {
          flex: 1;
          border-right: 1px solid #111;
          display: flex;
          flex-direction: column;
        }

        .lr-vehicle-cell {
          flex: 1;
          display: flex;
          align-items: stretch;
        }

        .lr-cns-label {
          width: 20px;
          min-width: 20px;
          font-size: 9px;
        }

        .lr-cns-top {
          flex: 1;
          min-height: 54px;
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid #111;
        }

        .lr-cns-number {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #EF6711;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .lr-vehicle-number {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          color: #16213e;
          letter-spacing: 0.4px;
        }

        .lr-cns-date-row {
          min-height: 28px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
        }

        .lr-cns-date-row .lr-label {
          margin-bottom: 0;
        }

        .lr-cns-date-row strong {
          font-size: 13px;
          color: #16213e;
          font-weight: 800;
        }

        /* Aligns with row-three on the left */
        .lr-actual-charged-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 34px;
          border-bottom: 1px solid #111;
        }

        .lr-actual-charged-row > * {
          padding: 3px 5px;
          border-right: 1px solid #111;
        }

        .lr-actual-charged-row > *:last-child {
          border-right: 0;
        }

        /* ============================================================= */
        /* BOTTOM ROW: TERMS / DESCRIPTION / CLASSIFICATION / ACK         */
        /* ============================================================= */

        .lr-bottom-row-left {
          display: flex;
          flex: 1;
          min-height: 92px;
        }

        .lr-terms-cell {
          width: 58%;
          padding: 4px;
          border-right: 1px solid #111;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .lr-terms-text {
          font-size: 11px;
          font-weight: 300;
          line-height: 1.1;
          letter-spacing: 0.4px;
          text-align: start;
          color: #3f3f46;
        }

        .lr-terms-caption {
          font-size: 12px;
          font-weight: 400;
          color: #16213e;
        }

        .lr-description-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .lr-description-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 4px 6px;
        }

        .lr-goods-block {
          padding-top: 5px;
          border-top: 1px dashed #a1a1aa;
        }

        .lr-classification-block {
          padding-bottom: 5px;
        }

        .lr-copy-name-row {
          border-top: 1px solid #111;
          padding: 3px 6px;
        }

        .lr-goods-value {
          margin-top: 5px;
          font-size: 13px;
          font-weight: 700;
          color: #16213e;
          line-height: 1.3;
          word-break: break-word;
        }

        .lr-goods-block .lr-goods-value {
          font-size: 16px;
        }

        .lr-classification-block .lr-goods-value {
          margin-top: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #52525b;
        }

        .lr-ack-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .lr-insurance-row {
          display: grid;
          grid-template-columns: 58% 42%;
          border-bottom: 1px solid #111;
        }

        .lr-insurance-row > * {
          padding: 3px 5px;
          border-right: 1px solid #111;
        }

        .lr-insurance-row > *:last-child {
          border-right: 0;
        }

        .lr-ack-banner {
          text-align: center;
          padding: 4px 4px;
          font-size: 11.5px;
          font-weight: 900;
          color: #fff;
          background: #16213e;
          letter-spacing: 0.5px;
        }

        .lr-ack-footer {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 5px 7px;
          gap: 8px;
        }

        .lr-copy-name {
          text-align: center;
          color: #EF6711;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .lr-copy-date,
        .lr-copy-sign {
          font-size: 12px;
          color: #52525b;
          font-weight: 600;
        }

        /* ============================================================= */
        /* CHARGES (RIGHT COLUMN)                                         */
        /* ============================================================= */

        .lr-charges {
          font-size: 12.5px;
          display: flex;
          flex-direction: column;
          color: #26314a;
        }

        .lr-charge-header {
          min-height: 22px;
          display: grid;
          grid-template-columns: 60% 40%;
          font-weight: 800;
          border-bottom: 1px solid #111;
          background: #16213e;
          color: #fff;
          letter-spacing: 0.3px;
        }

        .lr-charge-header span {
          display: flex;
          align-items: center;
          padding: 3px 6px;
          border-right: 1px solid rgba(255, 255, 255, 0.25);
        }

        .lr-charge-header span:last-child {
          border-right: 0;
          justify-content: flex-end;
        }

        .lr-charge-row {
          min-height: 19px;
          display: grid;
          grid-template-columns: 60% 40%;
          border-bottom: 1px solid #111;
        }

        .lr-charge-row > * {
          padding: 2.5px 6px;
          border-right: 1px solid #111;
          font-weight: 600;
        }

        .lr-charge-row > *:last-child {
          border-right: 0;
          text-align: right;
          font-weight: 700;
          color: #16213e;
        }

        .lr-subtotal {
          font-weight: 800;
          background: #f4f5f7;
        }

        .lr-subtotal strong {
          color: #16213e;
        }

        .lr-grand-total {
          min-height: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 8px;
          border-bottom: 1px solid #111;
          font-size: 14px;
          color: #fff;
          background: #EF6711;
          letter-spacing: 0.3px;
        }

        .lr-amount-words {
          min-height: 50px;
          padding: 5px 6px;
          border-bottom: 1px solid #111;
        }

        .lr-amount-words > div:last-child {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 700;
          color: #16213e;
        }

        /* ============================================================= */
        /* PAYMENT                                                        */
        /* ============================================================= */

        .lr-basis {
          min-height: 46px;
          padding: 5px 6px;
          border-bottom: 1px solid #111;
        }

        .lr-checkbox-row {
          display: flex;
          justify-content: space-between;
          gap: 4px;
          margin-top: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #26314a;
        }

        .lr-cod-row {
          min-height: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px;
          border-bottom: 1px solid #111;
          font-weight: 700;
        }

        .lr-gst-payable {
          min-height: 38px;
          padding: 5px 6px;
          border-bottom: 1px solid #111;
        }

        .lr-authorized {
          flex: 1;
          padding: 5px 6px;
          text-align: start;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .lr-authorized-space {
          flex: 1;
          min-height: 16px;
        }

        .lr-authorized strong {
          display: block;
          font-size: 10.5px;
          color: #16213e;
        }

        .lr-authorized-line {
          width: 80%;
          margin: 12px auto 3px;
          border-top: 1px solid #111;
        }

        .lr-authorized span {
          font-size: 10.5px;
          color: #6b7280;
        }

        /* ============================================================= */
        /* FOOTER                                                         */
        /* ============================================================= */

        .lr-footer {
          padding: 4px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          font-size: 10px;
          background: #f7f7f8;
          border-top: 1px solid #111;
        }

        .lr-footer-text {
          max-width: 85%;
          color: #52525b;
          font-weight: 500;
        }

        .lr-footer strong {
          color: #b91c1c;
          white-space: nowrap;
          letter-spacing: 0.3px;
          font-size: 11px;
        }

        /* ============================================================= */
        /* SCREEN RESPONSIVE                                              */
        /* ============================================================= */


        /* ============================================================= */
        /* PRINT                                                          */
        /* A4 landscape with a 5mm margin on every side. The printable    */
        /* area is 287mm x 200mm, which .lr-page is sized to fill         */
        /* exactly — no larger, so nothing is cut off by the printer.     */
        /* ============================================================= */

        @media print {
            @page {
              size: A4 landscape;
              margin: 5mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100%;
              background: white !important;
            }

            .lr-preview {
              min-height: 0 !important;
              background: white !important;
            }

            .lr-toolbar {
              display: none !important;
            }

            .lr-document {
              display: block !important;
              padding: 0 !important;
              gap: 0 !important;
            }

            /* .lr-page is already a fixed 287mm x 200mm — that alone fills exactly
              one printable page with no gap and no overflow, so there's no longer
              any need for a wrapping frame, vh sizing, or flex centering. Those
              were the actual source of the blank-page bug: vh is computed
              inconsistently across browsers/OSes in print contexts and can end up
              a fraction over one page, spilling an almost-empty page 2. */
            .lr-page {
              width: 287mm;
              height: 200mm;
              margin: 0 !important;
              border: 1px solid #111;
              box-shadow: none !important;
            }

            /* Break before every copy that has a preceding sibling — i.e. every
              page except the first. With only one copy selected, there is no
              earlier sibling, so this selector simply never matches — a
              single-copy print can never produce an extra page, guaranteed
              (unlike page-break-after + :last-child, which Chrome sometimes still
              fires even when :last-child should cancel it). */
            .lr-page + .lr-page {
              page-break-before: always;
              break-before: page;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
`;

export function LRStyles() {
  return <style dangerouslySetInnerHTML={{ __html: LR_CSS }} />;
}
