import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSupplierInput, supplierSetFields, supplierUnsetFields } from "../validations";

test("accepts a minimal supplier", () => {
  const r = parseSupplierInput({ name: "Ram Roadlines" });
  assert.equal(r.ok, true);
});

test("rejects bad PAN, IFSC, GSTIN, mobile and PIN with a clear message", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ name: "Ram", panNumber: "BAD" }, /PAN/],
    [{ name: "Ram", bankDetails: { ifscCode: "123" } }, /IFSC/],
    [{ name: "Ram", gstin: "12345" }, /GSTIN/],
    [{ name: "Ram", mobile: "123" }, /mobile/i],
    [{ name: "Ram", pincode: "12" }, /PIN/],
    [{ name: "Ram", defaultTdsRate: 150 }, /TDS/],
  ];
  for (const [body, message] of cases) {
    const r = parseSupplierInput(body);
    assert.equal(r.ok, false, JSON.stringify(body));
    if (!r.ok) assert.match(r.message, message);
  }
});

test("blank optional fields are allowed and PAN / IFSC / GSTIN are upper-cased", () => {
  const r = parseSupplierInput({
    name: "Ram",
    panNumber: "abcde1234f",
    gstin: "24abcde1234f1z5",
    mobile: "",
    pincode: "",
    bankDetails: { ifscCode: "hdfc0001234" },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.panNumber, "ABCDE1234F");
    assert.equal(r.data.gstin, "24ABCDE1234F1Z5");
    assert.equal(r.data.bankDetails?.ifscCode, "HDFC0001234");
  }
});

test("an update only sets the fields that were sent", () => {
  const r = parseSupplierInput({ name: "Ram", bankDetails: { upiId: "ram@upi" } });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const set = supplierSetFields(r.data);
  assert.equal(set.name, "Ram");
  assert.equal(set["bankDetails.upiId"], "ram@upi");
  assert.equal("bankDetails.accountNumber" in set, false); // not wiped
  assert.equal("panNumber" in set, false); // not wiped
});

test("a null TDS rate is removed, not stored as zero", () => {
  const r = parseSupplierInput({ name: "Ram", defaultTdsRate: null });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal("defaultTdsRate" in supplierSetFields(r.data), false);
  assert.deepEqual(supplierUnsetFields(r.data), { defaultTdsRate: "" });
});

test("a blank mobile is stored as null", () => {
  const r = parseSupplierInput({ name: "Ram", mobile: "" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(supplierSetFields(r.data).mobile, null);
});
