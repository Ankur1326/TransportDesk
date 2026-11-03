import { formatInr } from "@/lib/ledger/format";

const istDateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function compactInr(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (absolute >= 10_000_000) {
    return `${sign}₹${(absolute / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  }
  if (absolute >= 100_000) {
    return `${sign}₹${(absolute / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  return `${sign}${formatInr(absolute)}`;
}

export function formatIstDate(value: string | Date, includeTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (includeTime) return istDateTime.format(date);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function chartScale(values: readonly number[], height: number) {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  const domain = max > 0 ? max : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  return {
    max: domain,
    position(value: number): number {
      if (!Number.isFinite(value) || value <= 0) return 0;
      return Math.min(safeHeight, Math.max(0, (value / domain) * safeHeight));
    },
  };
}
