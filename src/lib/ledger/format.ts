/** Browser-safe display helpers for the ledger UI. */

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 1169500 -> "₹11,69,500". Sign is dropped; callers show Dr / Cr instead. */
export const formatInr = (amount: number): string => `₹${inr.format(Math.abs(amount))}`;

/** ISO date -> DD-MM-YYYY. */
export function formatLedgerDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB").replaceAll("/", "-");
}

/** net > 0 means the customer owes us. */
export const isReceivable = (net: number): boolean => net > 0;
