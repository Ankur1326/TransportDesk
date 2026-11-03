export type DocumentStatus = "Valid" | "Expiring" | "Expired" | "Missing";

function utcDay(value: Date | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDocumentStatus(
  expiresOn: Date | string | null | undefined,
  today: Date | string = new Date(),
  warnDays = 30
): DocumentStatus {
  const expiryDay = utcDay(expiresOn);
  const todayDay = utcDay(today);
  if (expiryDay === null || todayDay === null) return "Missing";
  if (expiryDay < todayDay) return "Expired";
  const warningDays = Number.isFinite(warnDays) ? Math.max(0, Math.floor(warnDays)) : 30;
  return expiryDay - todayDay <= warningDays * 86400000 ? "Expiring" : "Valid";
}
