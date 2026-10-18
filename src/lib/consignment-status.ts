/**
 * LR (bilty) lifecycle. Shared by the API routes and the UI — keep this file
 * free of server-only imports.
 */
export const LR_STATUSES = ["Booked", "On Route", "Delivered", "Cancelled"] as const;
export type LrStatus = (typeof LR_STATUSES)[number];

/** Legacy documents have no `status`; they are treated as Booked. */
export const DEFAULT_LR_STATUS: LrStatus = "Booked";

/**
 * Allowed moves. Cancelled is terminal. Delivered can only be rolled back to
 * On Route (to undo a mistaken click) — it can never be cancelled.
 */
export const LR_TRANSITIONS: Record<LrStatus, readonly LrStatus[]> = {
  Booked: ["On Route", "Delivered", "Cancelled"],
  "On Route": ["Delivered", "Cancelled"],
  Delivered: ["On Route"],
  Cancelled: [],
};

export function canTransition(from: LrStatus, to: LrStatus): boolean {
  return from === to || LR_TRANSITIONS[from].includes(to);
}

export function isLrStatus(value: unknown): value is LrStatus {
  return typeof value === "string" && (LR_STATUSES as readonly string[]).includes(value);
}
