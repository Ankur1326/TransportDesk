/**
 * Lorry hire contract numbering — pure helpers.
 *
 * Numbers are plain and continuous ("LHC/1624"), like the physical challan
 * book: no financial-year reset. The DB-backed `next-number` route (Phase 2)
 * finds the highest existing sequence and calls `nextLhcSequence`.
 */
import { LHC_PREFIX } from "./constants";

const LHC_PATTERN = /^LHC\/(\d{1,12})$/i;

/** `LHC/1624` -> 1624. Anything that isn't a plain LHC number -> null. */
export function parseLhcNo(value: string): number | null {
  const match = LHC_PATTERN.exec(value.trim());
  if (!match) return null;
  const seq = Number(match[1]);
  return Number.isSafeInteger(seq) ? seq : null;
}

export const formatLhcNo = (seq: number): string => `${LHC_PREFIX}${seq}`;

/**
 * The next sequence to issue: one more than the highest used, but never below
 * the company's configured starting number.
 */
export function nextLhcSequence(highestUsed: number | null | undefined, startNumber = 1): number {
  const start = Number.isSafeInteger(startNumber) && startNumber >= 1 ? startNumber : 1;
  return Math.max(start, typeof highestUsed === "number" ? highestUsed + 1 : start);
}

/** Mongo regex source matching only plain LHC numbers (used by the next-number aggregation). */
export const LHC_NUMBER_MONGO_REGEX = "^LHC/[0-9]+$";
