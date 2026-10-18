import { companyFilter } from "@/lib/company-scope";
import { escapeRegex } from "@/lib/escape-regex";
import { DEFAULT_LR_STATUS, isLrStatus } from "@/lib/consignment-status";

type Filter = Record<string, unknown>;

const PAYMENT_STATUS_VALUES = new Set(["Pending", "Partially Paid", "Paid", "Cancelled"]);

function clean(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim().slice(0, 100) ?? "";
}

/** `YYYY-MM-DD` -> Date at the start / end of that day (server local time). */
function dayBound(value: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface BuiltQuery {
  query: Filter;
  /** Same filters but ignoring `status` — used for the per-tab counts. */
  queryWithoutStatus: Filter;
}

/**
 * Build the Mongo filter for the list + counts endpoints.
 *
 * Supported params: search, status, paymentStatus, segment, from, to
 * (booking-date range, inclusive), fromCity, toCity, consignor, consignee,
 * vehicle, partyType + partyName, excludeBilled (handled by the caller).
 */
export function buildConsignmentQuery(params: URLSearchParams, companyId: string): BuiltQuery {
  const and: Filter[] = [companyFilter(companyId)];

  const search = clean(params, "search");
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    and.push({
      $or: [
        { consignmentNumber: regex },
        { vehicleNumber: regex },
        { "consignor.name": regex },
        { "consignee.name": regex },
        { eWayBillNumber: regex },
        { "from.location": regex },
        { "to.location": regex },
      ],
    });
  }

  const paymentStatus = clean(params, "paymentStatus");
  if (paymentStatus && PAYMENT_STATUS_VALUES.has(paymentStatus)) {
    and.push({ "payment.status": paymentStatus });
  }

  const segment = clean(params, "segment");
  if (segment) and.push({ segment });

  const contains = (key: string, field: string) => {
    const v = clean(params, key);
    if (v) and.push({ [field]: new RegExp(escapeRegex(v), "i") });
  };
  contains("fromCity", "from.location");
  contains("toCity", "to.location");
  contains("consignor", "consignor.name");
  contains("consignee", "consignee.name");
  contains("vehicle", "vehicleNumber");

  const partyType = clean(params, "partyType");
  const partyName = clean(params, "partyName");
  if (partyName && (partyType === "Consignor" || partyType === "Consignee")) {
    const key = partyType === "Consignor" ? "consignor.name" : "consignee.name";
    and.push({ [key]: new RegExp(escapeRegex(partyName), "i") });
  }

  const from = dayBound(clean(params, "from"), false);
  const to = dayBound(clean(params, "to"), true);
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    and.push({ bookingDate: range });
  }

  const queryWithoutStatus: Filter = { $and: [...and] };

  const status = clean(params, "status");
  if (status && isLrStatus(status)) {
    // Legacy documents have no status field and count as "Booked".
    and.push(
      status === DEFAULT_LR_STATUS
        ? { $or: [{ status }, { status: { $exists: false } }, { status: null }] }
        : { status }
    );
  }

  return { query: { $and: and }, queryWithoutStatus };
}

export type ListSort = "newest" | "oldest" | "booking_newest" | "booking_oldest";

export function sortSpec(value: string | null): Record<string, 1 | -1> {
  switch (value as ListSort) {
    case "oldest":
      return { createdAt: 1 };
    case "booking_newest":
      return { bookingDate: -1, createdAt: -1 };
    case "booking_oldest":
      return { bookingDate: 1, createdAt: 1 };
    default:
      return { createdAt: -1 };
  }
}
