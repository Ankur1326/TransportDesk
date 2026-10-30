import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import LorryHireModel from "@/models/LorryHire";
import PaymentModel from "@/models/Payment";
import { lorryHireFormSchema, summarizeLorryHireForm } from "../validations";
import { buildContractFields, mirrorPaymentDoc, paymentTotals, settlementFrom, summarizeStored } from "../build";

const input = (over: Record<string, unknown> = {}) => ({
  lhcNo: "lhc/1624",
  lhcDate: "2026-10-30",
  from: { location: "Jaipur", state: "Rajasthan" },
  to: { location: "Pune", state: "Maharashtra" },
  supplier: { name: "Shree Roadlines", mobile: "9876543210", pan: "abcde1234f" },
  owner: { sameAsSupplier: true },
  truck: { vehicleNumber: "mh 23 au 6718", capacity: 10 },
  items: [{ cnNo: "CN1", packages: 10, actualWeight: 2, chargedWeight: 2 }],
  freight: { rateMode: "Fixed", rate: 10000 },
  charges: [{ chargeId: "halting", name: "Halting", kind: "add", amount: 500 }],
  tax: { gstMode: "None", tdsRate: 1 },
  payments: [{ kind: "Advance", amount: 3000, date: "2026-10-30", mode: "UPI" }],
  ...over,
});

const supplierId = new mongoose.Types.ObjectId();

test("form → contract document passes the Mongoose schema", () => {
  const parsed = lorryHireFormSchema.parse(input());
  const summary = summarizeLorryHireForm(parsed);
  const doc = new LorryHireModel({
    ...buildContractFields(parsed, supplierId),
    payments: parsed.payments,
    settlement: settlementFrom(summary),
    companyId: "c1",
  });
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.lhcNo, "LHC/1624");
  assert.equal(doc.truck.vehicleNumber, "MH23AU6718");
  // Owner copied from the supplier when "same as supplier".
  assert.equal(doc.owner.name, "Shree Roadlines");
  assert.equal(doc.owner.pan, "ABCDE1234F");
  // 10000 + 500 gross, 1% TDS deducted = 10395; 3000 paid.
  assert.equal(doc.settlement.grossHire, 10500);
  assert.equal(doc.settlement.netPayable, 10395);
  assert.equal(doc.settlement.balance, 7395);
  assert.equal(doc.settlement.paymentStatus, "Partial");
});

test("blank optional dates are left unset, not cast to null/invalid", () => {
  const parsed = lorryHireFormSchema.parse(input({ loadingDate: "", driver: { licenseExpiry: "" } }));
  const f = buildContractFields(parsed, supplierId);
  assert.equal(f.loadingDate, undefined);
  assert.equal(f.driver.licenseExpiry, undefined);
  assert.equal(f.items[0].consignmentId, undefined);
});

test("summarizeStored matches the form summary; paymentTotals rounds exactly", () => {
  const parsed = lorryHireFormSchema.parse(input());
  const a = summarizeLorryHireForm(parsed);
  const b = summarizeStored({ ...buildContractFields(parsed, supplierId), payments: parsed.payments });
  assert.equal(a.netPayable, b.netPayable);
  assert.deepEqual(paymentTotals(100, [{ amount: 0.1 }, { amount: 0.2 }]), {
    totalPaid: 0.3,
    balance: 99.7,
    paymentStatus: "Partial",
  });
  assert.equal(paymentTotals(100, [{ amount: 100 }]).paymentStatus, "Paid");
  assert.equal(paymentTotals(100, []).paymentStatus, "Unpaid");
});

test("mirror payment row is a valid supplier 'paid' Payment", () => {
  const row = mirrorPaymentDoc({
    companyId: "c1",
    userId: String(new mongoose.Types.ObjectId()),
    ledgerId: new mongoose.Types.ObjectId(),
    contract: { _id: new mongoose.Types.ObjectId(), lhcNo: "LHC/1", supplierId, supplierName: "Shree Roadlines" },
    payment: { kind: "Advance", amount: 3000, date: "2026-10-30", mode: "UPI", reference: "UTR1", paidTo: "Ramesh", remark: "" },
  });
  assert.equal(new PaymentModel(row).validateSync(), undefined);
  assert.equal(row.direction, "paid");
  assert.equal(row.partyType, "supplier");
  assert.equal(row.remark, "Advance payment to Ramesh");
});
