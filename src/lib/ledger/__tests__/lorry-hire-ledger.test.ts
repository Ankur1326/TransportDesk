import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSupplierLedger, type LedgerSupplier } from "../build-supplier-ledger";
import { isLiveLorryHire, lorryHireToLedgerContract, lorryHireToLedgerPayments } from "../lorry-hire-ledger";

const supplier: LedgerSupplier = { _id: "s1", name: "Ram Roadlines", openingBalance: 0, balanceType: "credit", createdAt: "2026-01-01" };

const hire = {
  _id: "h1",
  lhcNo: "LHC/26-27/1",
  lhcDate: "2026-10-01",
  status: "Hired",
  truck: { vehicleNumber: "MH23AU6718" },
  items: [{ cnNo: "CN1" }, { cnNo: "" }],
  settlement: { netPayable: 10000 },
  payments: [
    { _id: "p1", ledgerPaymentId: "m1", kind: "Advance", amount: 4000, date: "2026-10-02", mode: "UPI", paidTo: "Driver" },
    { _id: "p2", kind: "Part", amount: 1000, date: "2026-10-05", remark: "diesel" },
  ],
};

test("an LHC becomes a payable contract flagged as lorry hire", () => {
  const c = lorryHireToLedgerContract(hire);
  assert.equal(c.contractNo, "LHC/26-27/1");
  assert.equal(c.totalPayable, 10000);
  assert.equal(c.lorryHireId, "h1");
  assert.equal(c.vehicleNo, "MH23AU6718");
  assert.deepEqual(c.consignmentNos, ["CN1"]);
});

test("LHC payments keep the mirror id and link to the LHC", () => {
  const [a, b] = lorryHireToLedgerPayments(hire);
  assert.equal(a._id, "m1");
  assert.equal(b._id, "p2");
  assert.equal(a.contractId, "h1");
  assert.equal(a.lorryHireId, "h1");
  assert.equal(a.remark, "Advance payment to Driver");
  assert.equal(b.remark, "diesel");
});

test("supplier ledger counts an LHC's payable and payments once", () => {
  const ledger = buildSupplierLedger({
    supplier,
    contracts: [lorryHireToLedgerContract(hire)],
    payments: lorryHireToLedgerPayments(hire),
  });
  assert.equal(ledger.summary.overallNetBalance, 5000); // 10000 payable - 5000 paid
  const status = ledger.billStatuses["h1"];
  assert.equal(status.outstanding, 5000);
  // The drawer uses this flag to make the entry read-only.
  assert.ok(ledger.entries.filter((e) => e.source === "contract" || e.source === "payment").every((e) => e.meta.lorryHireId === "h1"));
});

test("cancelled LHCs are not live", () => {
  assert.equal(isLiveLorryHire({ status: "Cancelled" }), false);
  assert.equal(isLiveLorryHire({ status: "Hired" }), true);
});
