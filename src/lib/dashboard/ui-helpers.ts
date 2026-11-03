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

export function relativeTime(value: string | Date, now: Date): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Time unavailable";
  const difference = now.getTime() - timestamp;
  if (difference < 0) {
    const minutes = Math.max(1, Math.floor(-difference / 60_000));
    return minutes < 60 ? `in ${minutes}m` : `in ${Math.floor(minutes / 60)}h`;
  }
  if (difference < 60_000) return "just now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  return `${Math.floor(difference / 86_400_000)}d ago`;
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

export function greeting(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(date)
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
