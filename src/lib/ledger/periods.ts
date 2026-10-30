/** Quick date ranges for the ledger toolbar (browser-safe, local time). Indian financial year: 1 Apr - 31 Mar. */
export type PeriodKey = "all" | "this-month" | "last-month" | "this-fy" | "last-fy";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-fy", label: "This FY" },
  { key: "last-fy", label: "Last FY" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export function periodRange(key: PeriodKey, now: Date = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "all":
      return { from: "", to: "" };
    case "this-month":
      return { from: ymd(y, m, 1), to: ymd(y, m, lastDay(y, m)) };
    case "last-month": {
      const py = m === 0 ? y - 1 : y;
      const pm = m === 0 ? 11 : m - 1;
      return { from: ymd(py, pm, 1), to: ymd(py, pm, lastDay(py, pm)) };
    }
    case "this-fy":
    case "last-fy": {
      const start = (m >= 3 ? y : y - 1) - (key === "last-fy" ? 1 : 0);
      return { from: ymd(start, 3, 1), to: ymd(start + 1, 2, 31) };
    }
  }
}

/** Which quick range the current dates equal, or "custom". */
export function activePeriod(from: string, to: string, now: Date = new Date()): PeriodKey | "custom" {
  for (const { key } of PERIODS) {
    const r = periodRange(key, now);
    if (r.from === from && r.to === to) return key;
  }
  return "custom";
}
