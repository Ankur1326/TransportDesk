/**
 * The truck types you can hire, and how a stored value maps to an icon.
 *
 * A contract stores the type's LABEL as plain text in `truck.truckType` (that is
 * what was always stored, so old contracts keep working). `findTruckType` also
 * understands the values older versions of the form saved ("Pickup",
 * "Open Truck", ...) so those still show the right icon.
 *
 * Pure data + helpers — no React — so it is safe on the server and in tests.
 */

export const TRUCK_TYPE_CATALOG = [
  { key: "any", label: "Any Truck Type" },
  { key: "mini", label: "Mini Truck (Tempo)" },
  { key: "pickup", label: "Pickup Truck (Bolero Type)" },
  { key: "small", label: "Small Truck (Eicher Type)" },
  { key: "half-body", label: "Half Body Truck (Open)" },
  { key: "full-body", label: "Full Body Truck (Open-Close)" },
  { key: "flat-body", label: "Flat Body Truck (Open)" },
  { key: "container", label: "Container Body Truck" },
  { key: "half-trailer", label: "Half Body Trailer" },
  { key: "full-trailer", label: "Full Body Trailer" },
  { key: "flat-trailer", label: "Flat Trailer" },
  { key: "tanker", label: "Tanker" },
  { key: "tipper", label: "Tipper Truck" },
  { key: "tractor-trailer", label: "Tractor Trailer" },
  { key: "vehicle-carrier", label: "Vehicle Carrier Truck" },
  { key: "bulker", label: "Bulker Truck" },
  { key: "concrete-mixer", label: "Concrete Mixture" },
] as const;

export type TruckTypeKey = (typeof TRUCK_TYPE_CATALOG)[number]["key"];
export type TruckTypeEntry = (typeof TRUCK_TYPE_CATALOG)[number];

/** Labels the earlier version of the form could save → the type they mean. */
const LEGACY_ALIASES: Record<string, TruckTypeKey> = {
  "mini truck (tempo)": "mini",
  pickup: "pickup",
  "open truck": "half-body",
  "closed container": "container",
  trailer: "full-trailer",
  tanker: "tanker",
  tipper: "tipper",
};

const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();

/** The catalog entry a stored value stands for, or null ("Other", blank, free text). */
export function findTruckType(value: string | null | undefined): TruckTypeEntry | null {
  if (!value) return null;
  const n = norm(value);
  const byLabel = TRUCK_TYPE_CATALOG.find((t) => norm(t.label) === n);
  if (byLabel) return byLabel;
  const aliased = LEGACY_ALIASES[n];
  return aliased ? (TRUCK_TYPE_CATALOG.find((t) => t.key === aliased) ?? null) : null;
}

/** Values for the dropdown: the catalog, plus the saved value when it isn't one of them. */
export function truckTypeChoices(current?: string | null): { value: string; key: TruckTypeKey | null }[] {
  const base = TRUCK_TYPE_CATALOG.map((t) => ({ value: t.label as string, key: t.key as TruckTypeKey | null }));
  const c = (current ?? "").trim();
  if (!c || base.some((b) => b.value === c)) return base;
  return [...base, { value: c, key: findTruckType(c)?.key ?? null }];
}
