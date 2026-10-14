import { z } from "zod";

export const chargeLineSchema = z.object({
  chargeId: z.string().regex(/^[a-z0-9_-]{1,48}$/),
  name: z.string().trim().min(1).max(60),
  amount: z.coerce.number().finite().nonnegative().max(1000000000),
});

export interface ChargeDefinition {
  id: string;
  name: string;
  defaultAmount: number | null;
  includeOnBilty: boolean;
  includeOnBill: boolean;
  legacyBiltyField?: string;
  legacyBillField?: string;
}

export interface ChargeLine {
  chargeId: string;
  name: string;
  amount: number;
}

export const DEFAULT_CHARGE_DEFINITIONS: ChargeDefinition[] = [
  { id: "freight", name: "Freight", defaultAmount: null, includeOnBilty: true, includeOnBill: true, legacyBiltyField: "freight", legacyBillField: "freightAmt" },
  { id: "local-godown", name: "Local Godown Charges", defaultAmount: null, includeOnBilty: true, includeOnBill: false, legacyBiltyField: "localGodownCharges" },
  { id: "unloading", name: "Unloading Charges", defaultAmount: null, includeOnBilty: true, includeOnBill: true, legacyBiltyField: "unloadingCharge", legacyBillField: "unloadingCharges" },
  { id: "loading", name: "Loading Charges", defaultAmount: null, includeOnBilty: true, includeOnBill: true, legacyBiltyField: "loadingCharge", legacyBillField: "loadingCharges" },
  { id: "statistical", name: "Statistical Charges", defaultAmount: null, includeOnBilty: true, includeOnBill: false, legacyBiltyField: "statisticalCharges" },
  { id: "local-collection", name: "Local Collection Charges", defaultAmount: null, includeOnBilty: true, includeOnBill: true, legacyBiltyField: "localCollectionCharges", legacyBillField: "lrCharges" },
  { id: "cod", name: "COD Charges", defaultAmount: null, includeOnBilty: false, includeOnBill: false, legacyBiltyField: "codCharges" },
  { id: "detention", name: "Detention Charges", defaultAmount: null, includeOnBilty: false, includeOnBill: true, legacyBillField: "detentionCharges" },
  { id: "gstin", name: "GSTIN Charges", defaultAmount: null, includeOnBilty: false, includeOnBill: true, legacyBillField: "gstinCharges" },
];

export function chargeLinesFromLegacy(
  values: object,
  definitions: ChargeDefinition[],
  side: "bilty" | "bill",
): ChargeLine[] {
  return definitions
    .filter((definition) => side === "bilty" ? definition.legacyBiltyField : definition.legacyBillField)
    .map((definition) => ({
      chargeId: definition.id,
      name: definition.name,
      amount: Number(Reflect.get(values, side === "bilty" ? definition.legacyBiltyField! : definition.legacyBillField!)) || 0,
    }));
}

export function syncLegacyChargeFields<T extends Record<string, unknown>>(charges: T): T {
  if (!Array.isArray(charges.chargeLines)) return charges;
  const updated = { ...charges };
  for (const definition of DEFAULT_CHARGE_DEFINITIONS) {
    const line = charges.chargeLines.find(
      (item): item is ChargeLine => Boolean(item) && typeof item === "object" && Reflect.get(item, "chargeId") === definition.id
    );
    if (!line) continue;
    if (definition.legacyBiltyField) Reflect.set(updated, definition.legacyBiltyField, line.amount);
  }
  return updated;
}
