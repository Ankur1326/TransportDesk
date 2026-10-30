/**
 * Pure aggregations over lorry hire contracts: trip profit, vehicles, drivers.
 * No I/O, browser-safe. Money is handled in paise.
 *
 * Revenue for a trip = freight of the LRs (consignments) carried on it.
 * Cost for a trip    = the contract's gross hire (basic freight + additions
 *                      − deductions, before GST/TDS) — GST under RCM is not
 *                      paid to the supplier and TDS is only withheld, so
 *                      gross hire is the true cost of the truck.
 * Cancelled contracts and cancelled LRs are ignored.
 */
import { normalizeVehicleNumber } from "./constants";

export interface ReportContract {
  _id: string;
  lhcNo: string;
  lhcDate: string;
  status: string;
  supplierName: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  truckType?: string;
  ownerName?: string;
  driverName?: string;
  driverMobile?: string;
  licenseNumber?: string;
  grossHire: number;
  items: { consignmentId?: string; cnNo: string }[];
}

export interface LrFreight {
  freight: number;
  status: string;
}

const toPaise = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100);
const fromPaise = (p: number): number => p / 100;
const time = (iso: string): number => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const live = (contracts: ReportContract[]) => contracts.filter((c) => c.status !== "Cancelled");

// ─── Trip profit ────────────────────────────────────────────────────────────

export interface TripProfitRow {
  _id: string;
  lhcNo: string;
  lhcDate: string;
  supplierName: string;
  vehicleNumber: string;
  route: string;
  revenue: number;
  cost: number;
  profit: number;
  /** null when there is no revenue to measure against. */
  marginPct: number | null;
  linkedLrs: number;
  /** Items typed by hand, or whose LR is missing/cancelled — revenue may be understated. */
  unlinkedItems: number;
}

export interface TripProfitTotals {
  trips: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number | null;
  lossTrips: number;
}

export function buildTripProfit(
  contracts: ReportContract[],
  lrFreight: Map<string, LrFreight>
): { rows: TripProfitRow[]; totals: TripProfitTotals } {
  const active = live(contracts);

  // An LR carried on several contracts must not be counted twice: split its
  // freight equally between the contracts that reference it.
  const usage = new Map<string, number>();
  for (const c of active) {
    for (const id of new Set(c.items.map((i) => i.consignmentId).filter((v): v is string => !!v))) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  }

  const rows: TripProfitRow[] = active.map((c) => {
    let revenueP = 0;
    let linked = 0;
    let unlinked = 0;
    const seen = new Set<string>();
    for (const item of c.items) {
      const id = item.consignmentId;
      const lr = id ? lrFreight.get(id) : undefined;
      if (!id || !lr || lr.status === "Cancelled") {
        unlinked += 1;
        continue;
      }
      if (seen.has(id)) continue; // same LR listed twice on one contract
      seen.add(id);
      linked += 1;
      revenueP += Math.round(toPaise(lr.freight) / (usage.get(id) ?? 1));
    }
    const costP = toPaise(c.grossHire);
    const profitP = revenueP - costP;
    return {
      _id: c._id,
      lhcNo: c.lhcNo,
      lhcDate: c.lhcDate,
      supplierName: c.supplierName,
      vehicleNumber: c.vehicleNumber,
      route: [c.fromLocation, c.toLocation].filter(Boolean).join(" → "),
      revenue: fromPaise(revenueP),
      cost: fromPaise(costP),
      profit: fromPaise(profitP),
      marginPct: revenueP > 0 ? Math.round((profitP / revenueP) * 10000) / 100 : null,
      linkedLrs: linked,
      unlinkedItems: unlinked,
    };
  });

  rows.sort((a, b) => time(b.lhcDate) - time(a.lhcDate));

  const revenueP = rows.reduce((s, r) => s + toPaise(r.revenue), 0);
  const costP = rows.reduce((s, r) => s + toPaise(r.cost), 0);
  return {
    rows,
    totals: {
      trips: rows.length,
      revenue: fromPaise(revenueP),
      cost: fromPaise(costP),
      profit: fromPaise(revenueP - costP),
      marginPct: revenueP > 0 ? Math.round(((revenueP - costP) / revenueP) * 10000) / 100 : null,
      lossTrips: rows.filter((r) => r.profit < 0).length,
    },
  };
}

// ─── Vehicles ───────────────────────────────────────────────────────────────

export interface VehicleSummary {
  vehicleNumber: string;
  truckType?: string;
  trips: number;
  totalHire: number;
  lastHired: string;
  lastDriver?: string;
  lastDriverMobile?: string;
  owner?: string;
  suppliers: string[];
}

export function aggregateVehicles(contracts: ReportContract[]): VehicleSummary[] {
  // Newest first, so the first contract seen per vehicle supplies "last" values.
  const sorted = [...live(contracts)].sort((a, b) => time(b.lhcDate) - time(a.lhcDate));
  const map = new Map<string, VehicleSummary & { hireP: number }>();

  for (const c of sorted) {
    const key = normalizeVehicleNumber(c.vehicleNumber);
    if (!key) continue;
    let v = map.get(key);
    if (!v) {
      v = {
        vehicleNumber: key,
        truckType: c.truckType || undefined,
        trips: 0,
        totalHire: 0,
        hireP: 0,
        lastHired: c.lhcDate,
        lastDriver: c.driverName || undefined,
        lastDriverMobile: c.driverMobile || undefined,
        owner: c.ownerName || undefined,
        suppliers: [],
      };
      map.set(key, v);
    }
    v.trips += 1;
    v.hireP += toPaise(c.grossHire);
    // Fill blanks from older contracts without overriding newer values.
    v.truckType ||= c.truckType || undefined;
    v.lastDriver ||= c.driverName || undefined;
    v.lastDriverMobile ||= c.driverMobile || undefined;
    v.owner ||= c.ownerName || undefined;
    if (c.supplierName && !v.suppliers.includes(c.supplierName)) v.suppliers.push(c.supplierName);
  }

  return [...map.values()]
    .map(({ hireP, ...v }) => ({ ...v, totalHire: fromPaise(hireP) }))
    .sort((a, b) => time(b.lastHired) - time(a.lastHired));
}

// ─── Drivers ────────────────────────────────────────────────────────────────

export interface DriverSummary {
  key: string;
  name: string;
  mobile?: string;
  licenseNumber?: string;
  trips: number;
  vehicles: string[];
  lastTrip: string;
}

const digits = (s: string | undefined): string => (s ?? "").replace(/\D/g, "");

export function aggregateDrivers(contracts: ReportContract[]): DriverSummary[] {
  const sorted = [...live(contracts)].sort((a, b) => time(b.lhcDate) - time(a.lhcDate));
  const map = new Map<string, DriverSummary>();

  for (const c of sorted) {
    const name = (c.driverName ?? "").trim();
    // Last 10 digits so "+91 98xxx" and "98xxx" are the same driver.
    const mobile = digits(c.driverMobile).slice(-10);
    const key = mobile.length === 10 ? `m:${mobile}` : name ? `n:${name.toLowerCase()}` : "";
    if (!key) continue;

    let d = map.get(key);
    if (!d) {
      d = {
        key,
        name: name || "Unnamed driver",
        mobile: mobile || undefined,
        licenseNumber: c.licenseNumber || undefined,
        trips: 0,
        vehicles: [],
        lastTrip: c.lhcDate,
      };
      map.set(key, d);
    }
    d.trips += 1;
    if (d.name === "Unnamed driver" && name) d.name = name;
    d.licenseNumber ||= c.licenseNumber || undefined;
    const veh = normalizeVehicleNumber(c.vehicleNumber);
    if (veh && !d.vehicles.includes(veh)) d.vehicles.push(veh);
  }

  return [...map.values()].sort((a, b) => time(b.lastTrip) - time(a.lastTrip));
}

/** Case-insensitive match of `q` against any of the given fields. */
export const matchesSearch = (q: string, ...fields: (string | undefined)[]): boolean => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  // "mh 23" should also find "MH23AU6718".
  const squashed = needle.replace(/[^a-z0-9]/g, "");
  return fields.some((f) => {
    const hay = (f ?? "").toLowerCase();
    return hay.includes(needle) || (squashed !== "" && hay.replace(/[^a-z0-9]/g, "").includes(squashed));
  });
};
