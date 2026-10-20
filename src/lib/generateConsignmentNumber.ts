import axios from "axios";

/**
 * Consignment numbering.
 *
 * The source of truth is the database: GET /api/consignments/next-number
 * looks at the highest consignment number already saved and returns one
 * more than that, starting from 1 for the very first consignment.
 * That keeps numbering correct and sequential across every browser,
 * device, and user — not just the current tab.
 *
 * localStorage is kept only as an instant placeholder for the very first
 * paint (before the network call resolves) and as an offline fallback if
 * the backend request fails. Whenever the backend answers, its number wins
 * and the local cache is updated to match.
 */
const CONSIGNMENT_SEQUENCE_KEY = "uts:consignment-sequence:v1";
const START_NUMBER = 1;

function readLastUsedNumber(): number {
  if (typeof window === "undefined") return START_NUMBER;

  try {
    const raw = window.localStorage.getItem(CONSIGNMENT_SEQUENCE_KEY);
    if (!raw) return START_NUMBER;

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= START_NUMBER ? parsed : START_NUMBER;
  } catch {
    return START_NUMBER;
  }
}

/** Records the highest consignment number we've seen so far, for the local fallback. */
export function saveConsignmentNumber(value: string): void {
  if (typeof window === "undefined") return;

  const trimmed = value?.trim();
  if (!trimmed) return;

  const matches = trimmed.match(/\d+/g);
  const parsed = matches ? Number(matches[matches.length - 1]) : NaN;

  if (Number.isFinite(parsed) && parsed >= START_NUMBER) {
    try {
      window.localStorage.setItem(CONSIGNMENT_SEQUENCE_KEY, String(parsed));
    } catch {
      // Ignore storage failures.
    }
  }
}

/**
 * Synchronous, local-only guess — used only as an instant placeholder before
 * the backend responds, or if the backend call fails outright (e.g. offline).
 * Prefer fetchNextConsignmentNumber() everywhere a network round-trip is fine.
 */
export function generateConsignmentNumber(): string {
  const hasExistingValue = typeof window !== "undefined" && window.localStorage.getItem(CONSIGNMENT_SEQUENCE_KEY) !== null;
  const lastUsedNumber = readLastUsedNumber();

  if (!hasExistingValue) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CONSIGNMENT_SEQUENCE_KEY, String(START_NUMBER));
      } catch {
        // Ignore storage failures.
      }
    }
    return String(START_NUMBER);
  }

  const nextNumber = lastUsedNumber + 1;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSIGNMENT_SEQUENCE_KEY, String(nextNumber));
    } catch {
      // Ignore storage failures.
    }
  }

  return String(nextNumber);
}

/**
 * Asks the backend for the next consignment number, based on the highest
 * number already saved in the database. Falls back to the local
 * localStorage-based guess if the request fails (e.g. offline).
 */
export async function fetchNextConsignmentNumber(): Promise<string> {
  try {
    const { data } = await axios.get<{ success: boolean; data?: { nextNumber: string } }>(
      "/api/admin/consignments/next-number/get"
    );
    const nextNumber = data?.data?.nextNumber;
    if (nextNumber) {
      saveConsignmentNumber(nextNumber);
      return nextNumber;
    }
  } catch {
    // Network/server issue — fall through to the local fallback below.
  }
  return generateConsignmentNumber();
}