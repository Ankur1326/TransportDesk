/**
 * Opening balance shared by Customers and Suppliers.
 *
 *  - Customer: "Receivable (Debit)" = they owe us, "Received (Credit)" = we owe them / advance.
 *  - Supplier: "Paid (Debit)" = we paid in advance, "Payable (Credit)" = we owe them.
 *
 * Stored as an amount (always >= 0) plus a `balanceType`.
 */
export const BALANCE_TYPES = ["debit", "credit"] as const;
export type BalanceType = (typeof BALANCE_TYPES)[number];

export const CUSTOMER_BALANCE_LABELS: Record<BalanceType, string> = {
  debit: "Receivable (Debit)",
  credit: "Received (Credit)",
};

export const SUPPLIER_BALANCE_LABELS: Record<BalanceType, string> = {
  debit: "Paid (Debit)",
  credit: "Payable (Credit)",
};

/** Validates request-body values. Missing values fall back to 0 / "debit". */
export function parseOpeningBalance(
  amount: unknown,
  type: unknown
): { ok: true; openingBalance: number; balanceType: BalanceType } | { ok: false; message: string } {
  const n = amount === undefined || amount === null || amount === "" ? 0 : Number(amount);
  if (!Number.isFinite(n) || n < 0) return { ok: false, message: "Opening balance must be a number of 0 or more." };
  const t = type === undefined || type === null || type === "" ? "debit" : type;
  if (!BALANCE_TYPES.includes(t as BalanceType)) return { ok: false, message: "Invalid balance type." };
  return { ok: true, openingBalance: Math.round(n * 100) / 100, balanceType: t as BalanceType };
}
