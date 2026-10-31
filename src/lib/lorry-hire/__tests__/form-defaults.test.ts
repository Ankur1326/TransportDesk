import { test } from "node:test";
import assert from "node:assert/strict";
import type { LorryHireRecord } from "../api";
import { buildDefaultValues, recordToFormValues } from "../form-defaults";
import { lorryHireFormSchema } from "../validations";

const record: LorryHireRecord = {
  _id: "r1", lhcNo: "LHC/10", lhcDate: "2026-10-01T00:00:00.000Z", loadingDate: "2026-10-02T00:00:00.000Z", transitDays: 2, loadType: "Full Load",
  from: { location: "Jaipur", state: "Rajasthan" }, to: { location: "Pune", state: "Maharashtra" },
  supplier: { supplierId: "507f1f77bcf86cd799439011", name: "Shree Roadlines", supplierType: "Broker", pan: "ABCDE1234F" },
  owner: { sameAsSupplier: true, name: "Shree Roadlines" },
  driver: { name: "Ramesh", mobile: "9876543210", licenseExpiry: "2030-01-01T00:00:00.000Z" },
  truck: { vehicleNumber: "MH23AU6718", capacity: 10, capacityUnit: "MTS" },
  weightUnit: "MTS",
  items: [{ consignmentId: "507f1f77bcf86cd799439012", cnNo: "CN1", cnDate: "2026-09-30T00:00:00.000Z", packages: 5, actualWeight: 2, chargedWeight: 2 }],
  freight: { rateMode: "Fixed", rate: 10000, freightPaidBy: "Transporter" },
  charges: [{ chargeId: "halting", name: "Halting Charge", kind: "add", amount: 500 }],
  tax: { gstMode: "None", gstRate: 0, tdsMode: "Deduction", tdsRate: 1, tdsSection: "194C", roundOff: false },
  shortage: { amount: 0, quantity: 0, unit: "KGS" },
  settlement: { grossHire: 10500, netPayable: 10395, totalPaid: 3000, balance: 7395, paymentStatus: "Partial", totalPackages: 5 },
  payments: [{ _id: "p1", kind: "Advance", amount: 3000, date: "2026-10-01T00:00:00.000Z", mode: "UPI" }],
  status: "Hired", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
};

test("a stored contract round-trips through the form schema (dates trimmed, payments left out)", () => {
  const form = recordToFormValues(record);
  assert.equal(form.lhcDate, "2026-10-01");
  assert.equal(form.driver.licenseExpiry, "2030-01-01");
  assert.equal(form.items[0].consignmentId, "507f1f77bcf86cd799439012");
  assert.deepEqual(form.payments, []);
  const parsed = lorryHireFormSchema.safeParse(form);
  assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.flatten()));
});

test("duplicate: new number and dates, no LR links, no payments, supplier kept", () => {
  const form = recordToFormValues(record, { lhcNo: "LHC/11", asCopy: true });
  assert.equal(form.lhcNo, "LHC/11");
  assert.deepEqual(form.items, []);
  assert.deepEqual(form.payments, []);
  assert.equal(form.expectedDeliveryDate, "");
  assert.equal(form.supplier.name, "Shree Roadlines");
  assert.equal(form.truck.vehicleNumber, "MH23AU6718");
});

test("blank form fails only on the required fields", () => {
  const r = lorryHireFormSchema.safeParse(buildDefaultValues("LHC/1"));
  assert.equal(r.success, false);
  const paths = !r.success ? Object.keys(r.error.flatten().fieldErrors) : [];
  assert.ok(paths.includes("supplier") && paths.includes("truck") && paths.includes("from"), paths.join(","));
});
