import { buildDefaultValues, type BillingFormValues } from "@/lib/validations/billing";
import type { CompanySettingsValues } from "@/lib/company-settings";

/** Realistic consignment used to preview LR formats in Settings. Never saved. */
export function buildSampleLr(): BillingFormValues {
  const base = buildDefaultValues("1");
  return {
    ...base,
    consignmentNumber: "1",
    bookingDate: "2026-10-15",
    cnsDate: "2026-10-15",
    eWayBillNumber: "281000123456",
    validUpTo: "2026-10-18T23:59",
    invoiceNumber: "INV-2627/0630",
    invoiceDate: "2026-10-14",
    vehicleNumber: "RJ 07 GB 1234",
    from: { location: "Bikaner", branch: "Bikaner Main", state: "Rajasthan", gstin: "08ABCDE1234F1Z5" },
    to: { location: "Ahmedabad", branch: "Naroda GIDC", state: "Gujarat", gstin: "24BBBBB0000B1Z5" },
    consignor: {
      ...base.consignor, name: "Shree Ram Traders", address: "12, Station Road", city: "Bikaner",
      state: "Rajasthan", gstin: "08AAAAA0000A1Z5", mobile: "98765 43210",
    },
    consignee: {
      ...base.consignee, name: "Mehta & Sons Pvt. Ltd.", address: "Plot 44, GIDC Naroda", city: "Ahmedabad",
      state: "Gujarat", gstin: "24BBBBB0000B1Z5", mobile: "91234 56780",
    },
    shipment: {
      ...base.shipment, packages: "120", packing: "Bags", description: "Guar gum powder (50 kg bags)",
      classification: "FMCG", declaredValue: "450000", volume: "340", actualWeight: "6000 Kg", chargeWeight: "6000 Kg",
    },
    segment: "FTL",
    loadType: "Actual Weight",
    vehicle: { ...base.vehicle, driverName: "Ramesh Kumar", driverMobile: "90000 11111", expectedDeliveryDate: "2026-10-18" },
    charges: {
      ...base.charges,
      freight: 42000, loadingCharge: 800, unloadingCharge: 600, localGodownCharges: 500,
      chargeLines: [
        { chargeId: "freight", name: "Freight", amount: 42000 },
        { chargeId: "loading", name: "Loading Charges", amount: 800 },
        { chargeId: "unloading", name: "Unloading Charges", amount: 600 },
        { chargeId: "local-godown", name: "Local Godown Charges", amount: 500 },
      ],
    } as BillingFormValues["charges"],
    tax: { type: "IGST", percentage: 5, customPercentage: undefined },
    payment: { ...base.payment, type: "To Pay", billingParty: "Consignee" },
  };
}

/** Fills blanks so a half-configured company still previews as a complete document. */
export function withSampleCompany(company: CompanySettingsValues): CompanySettingsValues {
  return {
    ...company,
    companyName: company.companyName || "Your Transport Company",
    tagline: company.tagline || "Reliable freight, on time",
    addressLine: company.addressLine || "12, Transport Nagar",
    city: company.city || "Bikaner",
    state: company.state || "Rajasthan",
    pinCode: company.pinCode || "334001",
    mobile1: company.mobile1 || "98765 43210",
    email: company.email || "info@yourcompany.in",
    gstNumber: company.gstNumber || "08ABCDE1234F1Z5",
    panNumber: company.panNumber || "ABCDE1234F",
    tanNumber: company.tanNumber || "JPRA12345B",
    cinNumber: company.cinNumber || "U60231RJ2020PTC012345",
    udyamNumber: company.udyamNumber || "UDYAM-RJ-00-1234567",
    uinNumber: company.uinNumber || "UIN-1234567",
    registrationNumber: company.registrationNumber || "U60231RJ2020PTC012345",
  };
}
