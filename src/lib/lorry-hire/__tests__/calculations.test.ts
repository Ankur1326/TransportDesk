import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeBasicFreight,
  computeCargoTotals,
  computeLorryHireSummary,
  computePaymentStatus,
  suggestTdsRate,
} from "../calculations";

const cargo = [
  { packages: 10, actualWeight: 5, chargedWeight: 6 },
  { packages: 5, actualWeight: 2.5, chargedWeight: 0 },
];

test("cargo totals: billable weight uses charged weight, else actual", () => {
  const t = computeCargoTotals(cargo);
  assert.equal(t.packages, 15);
  assert.equal(t.actualWeight, 7.5);
  assert.equal(t.chargedWeight, 6);
  assert.equal(t.billableWeight, 8.5); // 6 (charged) + 2.5 (actual fallback)
});

test("freight: Fixed uses the rate as the amount", () => {
  assert.deepEqual(computeBasicFreight({ rateMode: "Fixed", rate: 15000, items: cargo }), {
    quantity: 1,
    basicFreight: 15000,
  });
});

test("freight: Per Tonne with weights in MTS and in KGS", () => {
  assert.equal(computeBasicFreight({ rateMode: "Per Tonne", rate: 1000, weightUnit: "MTS", items: cargo }).basicFreight, 8500);
  const kgItems = [{ chargedWeight: 8500 }];
  assert.equal(computeBasicFreight({ rateMode: "Per Tonne", rate: 1000, weightUnit: "KGS", items: kgItems }).basicFreight, 8500);
});

test("freight: Per Kg and Per Package", () => {
  assert.equal(computeBasicFreight({ rateMode: "Per Kg", rate: 2, weightUnit: "MTS", items: [{ actualWeight: 1.5 }] }).basicFreight, 3000);
  assert.equal(computeBasicFreight({ rateMode: "Per Package", rate: 12.5, items: cargo }).basicFreight, 187.5);
});

test("summary: additions and deductions adjust the taxable gross hire", () => {
  const s = computeLorryHireSummary({
    rateMode: "Fixed",
    rate: 20000,
    charges: [
      { kind: "add", amount: 500 },
      { kind: "add", amount: 250 },
      { kind: "deduct", amount: 300 },
    ],
  });
  assert.equal(s.additions, 750);
  assert.equal(s.deductions, 300);
  assert.equal(s.grossHire, 20450);
  assert.equal(s.netPayable, 20450);
  assert.equal(s.balance, 20450);
  assert.equal(s.paymentStatus, "Unpaid");
});

test("summary: deductions can't push gross hire below zero", () => {
  const s = computeLorryHireSummary({ rate: 100, charges: [{ kind: "deduct", amount: 500 }] });
  assert.equal(s.grossHire, 0);
  assert.equal(s.netPayable, 0);
});

test("summary: GST is added, RCM is shown but not added", () => {
  const gst = computeLorryHireSummary({ rate: 10000, gstMode: "GST", gstRate: 12 });
  assert.equal(gst.gstAmount, 1200);
  assert.equal(gst.netPayable, 11200);

  const rcm = computeLorryHireSummary({ rate: 10000, gstMode: "RCM", gstRate: 18 });
  assert.equal(rcm.gstRate, 5); // flat 5% regardless of the typed rate
  assert.equal(rcm.gstAmount, 500);
  assert.equal(rcm.gstAdded, 0);
  assert.equal(rcm.netPayable, 10000);
});

test("summary: TDS deduction and addition", () => {
  assert.equal(computeLorryHireSummary({ rate: 10000, tdsMode: "Deduction", tdsRate: 1 }).netPayable, 9900);
  const add = computeLorryHireSummary({ rate: 10000, tdsMode: "Addition", tdsRate: 1 });
  assert.equal(add.tdsSigned, 100);
  assert.equal(add.netPayable, 10100);
});

test("summary: TDS is on the taxable value, not on GST", () => {
  const s = computeLorryHireSummary({ rate: 10000, gstMode: "GST", gstRate: 18, tdsMode: "Deduction", tdsRate: 2 });
  assert.equal(s.tdsAmount, 200);
  assert.equal(s.netPayable, 10000 + 1800 - 200);
});

test("summary: shortage is deducted and capped at gross hire", () => {
  assert.equal(computeLorryHireSummary({ rate: 10000, shortageAmount: 400 }).netPayable, 9600);
  assert.equal(computeLorryHireSummary({ rate: 1000, shortageAmount: 99999 }).netPayable, 0);
});

test("summary: round-off to a whole rupee", () => {
  const s = computeLorryHireSummary({ rate: 10000.6, roundOff: true });
  assert.equal(s.netPayable, 10001);
  assert.equal(s.roundOffAmount, 0.4);
  const down = computeLorryHireSummary({ rate: 10000.4, roundOff: true });
  assert.equal(down.netPayable, 10000);
  assert.equal(down.roundOffAmount, -0.4);
});

test("summary: payments, balance and payment status", () => {
  const base = { rate: 10000 };
  const none = computeLorryHireSummary({ ...base, payments: [] });
  assert.equal(none.paymentStatus, "Unpaid");

  const partial = computeLorryHireSummary({ ...base, payments: [{ amount: 3000 }, { amount: 2000 }] });
  assert.equal(partial.totalPaid, 5000);
  assert.equal(partial.balance, 5000);
  assert.equal(partial.paymentStatus, "Partial");

  const paid = computeLorryHireSummary({ ...base, payments: [{ amount: 10000 }] });
  assert.equal(paid.balance, 0);
  assert.equal(paid.paymentStatus, "Paid");

  const over = computeLorryHireSummary({ ...base, payments: [{ amount: 10500 }] });
  assert.equal(over.balance, 0);
  assert.equal(over.overpaid, 500);
});

test("a zero-value contract is never reported as Paid", () => {
  assert.equal(computePaymentStatus(0, 0), "Unpaid");
});

test("summary: tolerates blank / garbage numeric input", () => {
  const s = computeLorryHireSummary({
    rate: "" as unknown as number,
    charges: [{ kind: "add", amount: "abc" as unknown as number }],
    payments: [{ amount: undefined }, { amount: -50 }],
  });
  assert.equal(s.netPayable, 0);
  assert.equal(s.totalPaid, 0);
});

test("summary: amounts are rounded to paise without float drift", () => {
  const s = computeLorryHireSummary({ rate: 0.1, charges: [{ kind: "add", amount: 0.2 }] });
  assert.equal(s.grossHire, 0.3);
});

test("TDS suggestion follows PAN category", () => {
  assert.equal(suggestTdsRate({ pan: "ABCPE1234F" }).rate, 1); // P = individual
  assert.equal(suggestTdsRate({ pan: "abchd1234f" }).rate, 1); // H = HUF (case-insensitive)
  assert.equal(suggestTdsRate({ pan: "ABCCE1234F" }).rate, 2); // C = company
  assert.equal(suggestTdsRate({ pan: "ABCFE1234F" }).rate, 2); // F = firm
  assert.equal(suggestTdsRate({ pan: "" }).rate, 20);
  assert.equal(suggestTdsRate({ pan: "NOTAPAN" }).rate, 20);
  assert.equal(suggestTdsRate({ pan: "ABCPE1234F", hasDeclaration: true }).rate, 0);
  // A declaration without a valid PAN doesn't count.
  assert.equal(suggestTdsRate({ pan: "", hasDeclaration: true }).rate, 20);
});
