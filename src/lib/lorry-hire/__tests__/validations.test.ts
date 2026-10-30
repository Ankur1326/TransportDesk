import { test } from "node:test";
import assert from "node:assert/strict";

import { isValidIndianMobile, lorryHireFormSchema, summarizeLorryHireForm } from "../validations";

const minimal = () => ({
  lhcNo: "LHC/1624",
  lhcDate: "2026-10-30",
  from: { location: "Vadodara", state: "Gujarat" },
  to: { location: "Nagpur", state: "Maharashtra" },
  supplier: { name: "Shree Roadlines" },
  truck: { vehicleNumber: "mh-23 au 6718" },
});

const issues = (input: unknown) => {
  const r = lorryHireFormSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

test("a minimal contract parses and gets sensible defaults", () => {
  const r = lorryHireFormSchema.safeParse(minimal());
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.truck.vehicleNumber, "MH23AU6718"); // normalised
  assert.equal(r.data.loadType, "Full Load");
  assert.equal(r.data.freight.rateMode, "Fixed");
  assert.equal(r.data.freight.freightPaidBy, "Transporter");
  assert.equal(r.data.weightUnit, "MTS");
  assert.deepEqual(r.data.items, []);
  assert.deepEqual(r.data.payments, []);
});

test("required fields are reported", () => {
  const out = issues({});
  for (const path of ["lhcNo", "lhcDate", "from", "to", "supplier", "truck"]) {
    assert.ok(out.some((m) => m.startsWith(path)), `${path} should be required: ${out.join(" | ")}`);
  }
});

test("vehicle number, PAN, IFSC and mobile are validated", () => {
  const bad = {
    ...minimal(),
    truck: { vehicleNumber: "123" },
    supplier: { name: "X", pan: "BAD", mobile: "12345" },
    bank: { ifscCode: "NOPE" },
  };
  const out = issues(bad).join(" | ");
  assert.match(out, /truck\.vehicleNumber/);
  assert.match(out, /supplier\.pan/);
  assert.match(out, /supplier\.mobile/);
  assert.match(out, /bank\.ifscCode/);
});

test("PAN and IFSC are upper-cased", () => {
  const r = lorryHireFormSchema.safeParse({
    ...minimal(),
    supplier: { name: "X", pan: "abcpe1234f" },
    bank: { ifscCode: "hdfc0001234" },
  });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.supplier.pan, "ABCPE1234F");
    assert.equal(r.data.bank.ifscCode, "HDFC0001234");
  }
});

test("indian mobile formats", () => {
  for (const ok of ["9662820706", "+91 96628 20706", "919662820706", "09662820706"]) assert.equal(isValidIndianMobile(ok), true, ok);
  for (const bad of ["", "1234567890", "96628", "96628207061"]) assert.equal(isValidIndianMobile(bad), false, bad);
});

test("same From and To is rejected", () => {
  const out = issues({ ...minimal(), to: { location: "vadodara", state: "Gujarat" } });
  assert.ok(out.some((m) => m.startsWith("to.location")));
});

test("delivery before loading is rejected", () => {
  const out = issues({ ...minimal(), loadingDate: "2026-11-05", expectedDeliveryDate: "2026-11-01" });
  assert.ok(out.some((m) => m.startsWith("expectedDeliveryDate")));
});

test("duplicate CN numbers are rejected", () => {
  const item = { cnNo: "5001" };
  const out = issues({ ...minimal(), items: [item, { cnNo: "5001" }] });
  assert.ok(out.some((m) => m.startsWith("items.1.cnNo")));
});

test("payments may not exceed the net payable", () => {
  const input = {
    ...minimal(),
    freight: { rateMode: "Fixed", rate: 10000 },
    payments: [{ kind: "Advance", amount: 6000, date: "2026-10-30" }, { kind: "Final", amount: 5000, date: "2026-11-02" }],
  };
  assert.ok(issues(input).some((m) => m.startsWith("payments")));

  const ok = { ...input, payments: [{ kind: "Advance", amount: 6000, date: "2026-10-30" }] };
  assert.deepEqual(issues(ok), []);
});

test("summarizeLorryHireForm matches the maths on a parsed form", () => {
  const r = lorryHireFormSchema.parse({
    ...minimal(),
    weightUnit: "MTS",
    items: [{ cnNo: "1", chargedWeight: 10 }],
    freight: { rateMode: "Per Tonne", rate: 1500 },
    charges: [{ chargeId: "halting", name: "Halting Charge", kind: "add", amount: 500 }],
    tax: { tdsMode: "Deduction", tdsRate: 1 },
    payments: [{ kind: "Advance", amount: 5000, date: "2026-10-30" }],
  });
  const s = summarizeLorryHireForm(r);
  assert.equal(s.basicFreight, 15000);
  assert.equal(s.grossHire, 15500);
  assert.equal(s.tdsAmount, 155);
  assert.equal(s.netPayable, 15345);
  assert.equal(s.balance, 10345);
  assert.equal(s.paymentStatus, "Partial");
});
