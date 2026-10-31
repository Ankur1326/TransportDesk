import type { LorryHireRecord } from "./api";
import type { LorryHireFormValues } from "./validations";

const day = (v?: string | null): string => (v ? String(v).slice(0, 10) : "");
const today = (): string => new Date().toISOString().slice(0, 10);

export function buildDefaultValues(lhcNo = ""): LorryHireFormValues {
  return {
    lhcNo,
    lhcDate: today(),
    loadingDate: today(),
    expectedDeliveryDate: "",
    transitDays: 0,
    loadType: "Full Load",
    from: { location: "", state: "" },
    to: { location: "", state: "" },
    via: "",
    supplier: { supplierId: "", name: "", supplierType: "Broker", address: "", city: "", state: "", pincode: "", gstin: "", pan: "", mobile: "" },
    owner: { sameAsSupplier: false, name: "", mobile: "", pan: "", address: "" },
    driver: { name: "", mobile: "", licenseNumber: "", licenseExpiry: "" },
    truck: { vehicleNumber: "", truckType: "", capacity: 0, capacityUnit: "MTS", chassisNo: "", engineNo: "", permitNo: "", isOversize: false },
    insurance: { company: "", policyNumber: "", validUpto: "" },
    weightUnit: "MTS",
    items: [],
    freight: { rateMode: "Fixed", rate: 0, freightPaidBy: "Transporter" },
    charges: [],
    tax: { gstMode: "None", gstRate: 0, tdsMode: "Deduction", tdsRate: 0, tdsSection: "194C", roundOff: false },
    shortage: { amount: 0, quantity: 0, unit: "KGS", note: "" },
    bank: { accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", upiId: "" },
    remarks: "",
    internalNotes: "",
    preparedBy: "",
    passedBy: "",
    driverSignature: "",
    payments: [],
  };
}

/**
 * Stored contract -> form values. Payments are never loaded into the form:
 * once a contract exists they are managed through the payments API.
 * `asCopy` is for "Duplicate": fresh number/dates, no LR links, no payments.
 */
export function recordToFormValues(r: LorryHireRecord, opts: { lhcNo?: string; asCopy?: boolean } = {}): LorryHireFormValues {
  const base = buildDefaultValues(opts.lhcNo ?? r.lhcNo);
  const copy = !!opts.asCopy;
  return {
    ...base,
    lhcDate: copy ? today() : day(r.lhcDate),
    loadingDate: copy ? today() : day(r.loadingDate),
    expectedDeliveryDate: copy ? "" : day(r.expectedDeliveryDate),
    transitDays: r.transitDays ?? 0,
    loadType: r.loadType,
    from: { location: r.from.location, state: r.from.state ?? "" },
    to: { location: r.to.location, state: r.to.state ?? "" },
    via: r.via ?? "",
    supplier: { ...base.supplier, ...r.supplier, supplierId: r.supplier.supplierId ?? "" },
    owner: { ...base.owner, ...r.owner },
    driver: { ...base.driver, ...r.driver, licenseExpiry: day(r.driver?.licenseExpiry) },
    truck: { ...base.truck, ...r.truck },
    insurance: { ...base.insurance, ...r.insurance, validUpto: day(r.insurance?.validUpto) },
    weightUnit: r.weightUnit,
    // A duplicate keeps the cargo text but drops the LR link: that LR is on the original contract.
    items: copy
      ? []
      : r.items.map((i) => ({
          consignmentId: i.consignmentId ?? "",
          cnNo: i.cnNo,
          cnDate: day(i.cnDate),
          from: i.from ?? "",
          to: i.to ?? "",
          description: i.description ?? "",
          packages: i.packages,
          actualWeight: i.actualWeight,
          chargedWeight: i.chargedWeight,
        })),
    freight: r.freight,
    charges: r.charges,
    tax: r.tax,
    shortage: { amount: copy ? 0 : r.shortage.amount, quantity: copy ? 0 : r.shortage.quantity, unit: r.shortage.unit, note: copy ? "" : r.shortage.note ?? "" },
    bank: { ...base.bank, ...r.bank },
    remarks: copy ? "" : r.remarks ?? "",
    internalNotes: copy ? "" : r.internalNotes ?? "",
    preparedBy: r.preparedBy ?? "",
    passedBy: r.passedBy ?? "",
    driverSignature: copy ? "" : r.driverSignature ?? "",
    payments: [],
  };
}
