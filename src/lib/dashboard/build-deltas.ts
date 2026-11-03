/**
 * Period-over-period deltas for the KPI cards. Pure.
 */

export type DeltaDirection = "up" | "down" | "flat" | "none";

export interface Delta {
  direction: DeltaDirection;
  /** Percentage change, 1 decimal. null when it can't be expressed as a percentage (no previous value, or previous was 0). */
  pct: number | null;
  /** previous was 0 and current is not: shown as "New" rather than an infinite percentage. */
  isNew: boolean;
}

export const NO_DELTA: Delta = { direction: "none", pct: null, isNew: false };

/** A change smaller than this many percent counts as flat. */
const FLAT_BELOW_PCT = 0.05;

/**
 * current vs previous. `previous` of null/undefined/NaN means "nothing to compare"
 * (snapshot metrics, or a failed previous query) and yields no delta at all.
 * The denominator is |previous| so a margin that goes from -100 to -50 reads as
 * an improvement (up), not a 50% fall.
 */
export function computeDelta(current: number, previous: number | null | undefined): Delta {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return NO_DELTA;
  }
  if (previous === 0) {
    if (current === 0) return { direction: "flat", pct: 0, isNew: false };
    return { direction: current > 0 ? "up" : "down", pct: null, isNew: true };
  }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  if (Math.abs(pct) < FLAT_BELOW_PCT) return { direction: "flat", pct: 0, isNew: false };
  return { direction: pct > 0 ? "up" : "down", pct, isNew: false };
}

export type DeltaTone = "good" | "bad" | "neutral";

/**
 * Whether a movement is good news. Colour is never the only signal (the UI also
 * shows an arrow and the percentage), this only picks the colour.
 */
export function deltaTone(delta: Delta, better: "higher" | "lower" | "neutral"): DeltaTone {
  if (delta.direction === "none" || delta.direction === "flat" || better === "neutral") return "neutral";
  const improved = (delta.direction === "up") === (better === "higher");
  return improved ? "good" : "bad";
}
