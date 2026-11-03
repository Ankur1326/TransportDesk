/**
 * One "trip stage" per LR, derived from its lifecycle status, POD status and
 * the freight bill it sits on. Pure and browser-safe.
 *
 * Collection state comes from the bill (see computeBillStatuses in
 * src/lib/ledger/build-ledger.ts) — payment maths is NOT repeated here.
 */
import type { BillStatus } from "@/lib/ledger/build-ledger";
import { DEFAULT_LR_STATUS, isLrStatus } from "@/lib/consignment-status";
import { isPodCleared } from "@/lib/pod-status";

export const LR_STAGES = [
  "Booked",
  "On Route",
  "Delivered",
  "POD Received",
  "Billed",
  "Partially Paid",
  "Paid",
  "Cancelled",
] as const;
export type LrStage = (typeof LR_STAGES)[number];

export const isLrStage = (v: unknown): v is LrStage =>
  typeof v === "string" && (LR_STAGES as readonly string[]).includes(v);

/** Stepper order (Cancelled sits outside the happy path). */
export const STAGE_FLOW: readonly LrStage[] = [
  "Booked", "On Route", "Delivered", "POD Received", "Billed", "Partially Paid", "Paid",
];

/** Collection state of an LR derived from its bill. */
export type LrCollectionState = "Unbilled" | "Billed" | "Partially paid" | "Paid";

/**
 * Is the proof of delivery in hand? An explicit `podStatus` wins; on legacy
 * documents (no `podStatus`) an uploaded POD file means it was received.
 */
function podInHand(lr: Pick<StageLr, "podStatus" | "podUrl">): boolean {
  if (lr.podStatus) return isPodCleared(lr);
  return Boolean(lr.podUrl);
}

export interface StageLr {
  status?: string | null;
  podStatus?: string | null;
  podUrl?: string | null;
  /** Denormalised billing marker (may be missing or stale on legacy docs). */
  billing?: { billed?: boolean | null } | null;
}

/** The slice of a bill status the stage needs. */
export interface StageBill {
  status: BillStatus;
}

/**
 * - A bill, when given, is authoritative.
 * - Without one, `lr.billing.billed` still says "Billed" (payment unknown).
 * - Legacy documents (no status / podStatus / billing) never throw.
 */
export function getLrCollectionState(lr: StageLr, bill?: StageBill | null): LrCollectionState {
  if (bill) {
    if (bill.status === "Paid") return "Paid";
    return bill.status === "Partial" ? "Partially paid" : "Billed";
  }
  return lr.billing?.billed ? "Billed" : "Unbilled";
}

export function getLrStage(lr: StageLr, bill?: StageBill | null): LrStage {
  const status = isLrStatus(lr.status) ? lr.status : DEFAULT_LR_STATUS;
  if (status === "Cancelled") return "Cancelled";

  switch (getLrCollectionState(lr, bill)) {
    case "Paid": return "Paid";
    case "Partially paid": return "Partially Paid";
    case "Billed": return "Billed";
  }

  if (status === "Delivered") return podInHand(lr) ? "POD Received" : "Delivered";
  return status; // Booked | On Route
}

/** Index of the stage in the stepper, or -1 for Cancelled. */
export const stageIndex = (stage: LrStage): number => STAGE_FLOW.indexOf(stage);

export type StageCounts = Record<LrStage, number>;
export const emptyStageCounts = (): StageCounts =>
  Object.fromEntries(LR_STAGES.map((s) => [s, 0])) as StageCounts;

/** Tally a list of staged LRs into per-stage totals. */
export function tallyStages(rows: { stage: LrStage }[]): StageCounts {
  const counts = emptyStageCounts();
  for (const { stage } of rows) counts[stage] += 1;
  return counts;
}
