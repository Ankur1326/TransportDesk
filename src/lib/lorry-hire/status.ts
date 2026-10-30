/**
 * Lorry hire lifecycle. Browser-safe, same shape as lib/consignment-status.ts.
 */
import { LORRY_HIRE_STATUSES, type LorryHireStatus } from "./constants";

/**
 * Allowed moves. Cancelled is terminal. Delivered can only be rolled back to
 * In Transit (undo a mistaken click) — a delivered trip can't be cancelled.
 */
export const LORRY_HIRE_TRANSITIONS: Record<LorryHireStatus, readonly LorryHireStatus[]> = {
  Hired: ["In Transit", "Delivered", "Cancelled"],
  "In Transit": ["Delivered", "Cancelled"],
  Delivered: ["In Transit"],
  Cancelled: [],
};

export const canTransitionLorryHire = (from: LorryHireStatus, to: LorryHireStatus): boolean =>
  from === to || LORRY_HIRE_TRANSITIONS[from].includes(to);

export const isLorryHireStatus = (value: unknown): value is LorryHireStatus =>
  typeof value === "string" && (LORRY_HIRE_STATUSES as readonly string[]).includes(value);

/**
 * A contract that already has money paid against it can't be cancelled: the
 * payments must be removed (or refunded) first so the supplier ledger stays honest.
 */
export const canCancelLorryHire = (status: LorryHireStatus, totalPaid: number): { ok: boolean; reason?: string } => {
  if (!canTransitionLorryHire(status, "Cancelled")) {
    return { ok: false, reason: `A ${status.toLowerCase()} contract can't be cancelled.` };
  }
  if (totalPaid > 0) {
    return { ok: false, reason: "Remove the recorded payments before cancelling this contract." };
  }
  return { ok: true };
};
