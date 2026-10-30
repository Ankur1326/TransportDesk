import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSupplierLedger, filterEntries } from "../supplier-ledger";

const now = new Date("2026-10-30");
const pay = (id: string, amount: number, date: string) => ({ _id: id, kind: "Advance", amount, date });

test("builds payable, paid and running balance", () => {
  const l = buildSupplierLedger({
    now,
    opening: { amount: 1000, balanceType: "credit", date: "2026-01-01" },
    contracts: [
      { _id: "a", lhcNo: "LHC/1", lhcDate: "2026-10-01", status: "Hired", netPayable: 10000, payments: [pay("p1", 4000, "2026-10-02")] },
      { _id: "b", lhcNo: "LHC/2", lhcDate: "2026-06-01", status: "Delivered", netPayable: 5000, payments: [pay("p2", 5000, "2026-06-05")] },
    ],
  });
  assert.equal(l.totalPayable, 16000);
  assert.equal(l.totalPaid, 9000);
  assert.equal(l.balance, 7000);
  assert.equal(l.entries.at(-1)?.balance, 7000);
  assert.equal(l.contracts.find((c) => c._id === "a")?.outstanding, 6000);
  assert.equal(l.ageing[0].amount, 6000);
});

test("cancelled contracts are skipped; debit opening is an advance", () => {
  const l = buildSupplierLedger({
    now,
    opening: { amount: 500, balanceType: "debit", date: "2026-01-01" },
    contracts: [{ _id: "c", lhcNo: "LHC/3", lhcDate: "2026-10-01", status: "Cancelled", netPayable: 9999, payments: [] }],
  });
  assert.equal(l.balance, -500);
  assert.equal(l.contracts.length, 0);
});

test("filterEntries by date and type", () => {
  const l = buildSupplierLedger({
    now,
    contracts: [{ _id: "a", lhcNo: "LHC/1", lhcDate: "2026-10-01", status: "Hired", netPayable: 100, payments: [pay("p", 40, "2026-10-05")] }],
  });
  assert.equal(filterEntries(l.entries, new Date("2026-10-03"), null).length, 1);
  assert.equal(filterEntries(l.entries, null, null, "payable").length, 1);
});
