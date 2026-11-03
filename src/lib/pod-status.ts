/**
 * Proof-of-delivery (POD) tracking for an LR. Pure rules shared by the API
 * routes and the UI — keep this file free of server-only imports.
 *
 *   Pending --(file uploaded | mark received)--> Received --(mark submitted)--> Submitted
 *   Submitted --rollback--> Received --rollback--> Pending
 *
 * POD actions are only allowed while the LR is Delivered. Legacy documents
 * have no `podStatus` and count as Pending.
 */
import type { LrStatus } from "@/lib/consignment-status";

export const POD_STATUSES = ["Pending", "Received", "Submitted"] as const;
export type PodStatus = (typeof POD_STATUSES)[number];

export const DEFAULT_POD_STATUS: PodStatus = "Pending";

/** POD states that count as "we hold the proof" — the gate for billing. */
export const POD_CLEARED_STATUSES: readonly PodStatus[] = ["Received", "Submitted"];

/** statusHistory.note is limited to 200 characters in the schema. */
export const POD_NOTE_MAX = 200;
export const POD_SUBMITTED_TO_MAX = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isPodStatus(value: unknown): value is PodStatus {
  return typeof value === "string" && (POD_STATUSES as readonly string[]).includes(value);
}

export function getPodStatus(lr: { podStatus?: unknown } | null | undefined): PodStatus {
  return isPodStatus(lr?.podStatus) ? lr.podStatus : DEFAULT_POD_STATUS;
}

/** True once the POD has been Received or Submitted. */
export function isPodCleared(lr: { podStatus?: unknown } | null | undefined): boolean {
  return POD_CLEARED_STATUSES.includes(getPodStatus(lr));
}

/** POD actions (upload, receive, submit, rollback) need a Delivered LR. */
export function canActOnPod(lrStatus: LrStatus | string | undefined | null): boolean {
  return lrStatus === "Delivered";
}

/**
 * Mongo match for a POD status. Pending also matches documents that never had
 * the field, so legacy LRs are found by every query that looks for Pending.
 */
export function podStatusMatch(status: PodStatus): Record<string, unknown> {
  return status === "Pending"
    ? { $or: [{ podStatus: "Pending" }, { podStatus: { $exists: false } }, { podStatus: null }] }
    : { podStatus: status };
}

/** Mongo match for "Delivered but POD not yet received". */
export function pendingPodMatch(): Record<string, unknown> {
  return { $and: [{ status: "Delivered" }, podStatusMatch("Pending")] };
}

/** Mongo match for Received or Submitted. */
export function podClearedMatch(): Record<string, unknown> {
  return { podStatus: { $in: [...POD_CLEARED_STATUSES] } };
}

/* -------------------------------- actions --------------------------------- */

export type PodAction =
  | { type: "upload" }
  | { type: "receive"; remark?: string }
  | { type: "submit"; submittedAt?: Date | null; submittedTo?: string; note?: string }
  | { type: "rollback" };

export interface PodSnapshot {
  /** The LR's status (for an upload that also delivers the LR, pass "Delivered"). */
  lrStatus: LrStatus | string | undefined | null;
  podStatus?: unknown;
  /** A POD file is attached. */
  hasFile: boolean;
  podReceivedAt?: Date | string | null;
}

export interface PodChange {
  from: PodStatus;
  to: PodStatus;
  /** Fields to `$set`. */
  set: Record<string, unknown>;
  /** Fields to `$unset`. */
  unset: string[];
  /** Text for the statusHistory entry (always starts with "POD"). Max POD_NOTE_MAX chars. */
  note: string;
}

export type PodErrorCode = "NOT_DELIVERED" | "INVALID_TRANSITION" | "REMARK_REQUIRED" | "INVALID_DATE";

export type PodResult =
  | { ok: true; change: PodChange }
  | { ok: false; code: PodErrorCode; message: string };

const fail = (code: PodErrorCode, message: string): PodResult => ({ ok: false, code, message });

function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "POD Pending → Received: detail" (or "POD Received: detail" when nothing moved), capped for the schema. */
export function podHistoryNote(from: PodStatus, to: PodStatus, detail?: string): string {
  const head = from === to ? `POD ${to}` : `POD ${from} → ${to}`;
  const d = detail?.trim();
  return clip(d ? `${head}: ${d}` : head, POD_NOTE_MAX);
}

/**
 * Decide what a POD action does. Never touches the database — the caller turns
 * `change` into a Mongo update and a statusHistory entry.
 */
export function applyPodAction(snap: PodSnapshot, action: PodAction, now: Date = new Date()): PodResult {
  if (!canActOnPod(snap.lrStatus)) {
    return fail("NOT_DELIVERED", "POD can only be updated once the LR is Delivered.");
  }
  const from = getPodStatus(snap);

  switch (action.type) {
    case "upload": {
      // Already Received/Submitted: the file is replaced, the status stays.
      if (from !== "Pending") {
        return {
          ok: true,
          change: { from, to: from, set: {}, unset: [], note: podHistoryNote(from, from, "file replaced") },
        };
      }
      return {
        ok: true,
        change: {
          from,
          to: "Received",
          set: { podStatus: "Received", podReceivedAt: now },
          unset: [],
          note: podHistoryNote(from, "Received", "file uploaded"),
        },
      };
    }

    case "receive": {
      if (from !== "Pending") {
        return fail("INVALID_TRANSITION", `POD is already ${from}.`);
      }
      const remark = clip(action.remark ?? "", POD_NOTE_MAX);
      if (!snap.hasFile && !remark) {
        return fail("REMARK_REQUIRED", "Add a remark to mark the POD received without a file.");
      }
      const set: Record<string, unknown> = { podStatus: "Received", podReceivedAt: now };
      if (remark) set.podRemarks = remark;
      return {
        ok: true,
        change: {
          from,
          to: "Received",
          set,
          unset: [],
          note: podHistoryNote(from, "Received", remark || (snap.hasFile ? "file on record" : "")),
        },
      };
    }

    case "submit": {
      if (from === "Submitted") return fail("INVALID_TRANSITION", "POD is already Submitted.");
      if (from !== "Received") return fail("INVALID_TRANSITION", "Mark the POD Received before submitting it.");

      const at = action.submittedAt ?? now;
      if (Number.isNaN(at.getTime())) return fail("INVALID_DATE", "Enter a valid submission date.");
      if (at.getTime() > now.getTime() + DAY_MS) return fail("INVALID_DATE", "Submission date can't be in the future.");
      const received = toDate(snap.podReceivedAt);
      if (received && at.getTime() < received.getTime() - DAY_MS) {
        return fail("INVALID_DATE", "Submission date can't be before the POD was received.");
      }

      const to = clip(action.submittedTo ?? "", POD_SUBMITTED_TO_MAX);
      const note = clip(action.note ?? "", POD_NOTE_MAX);
      const set: Record<string, unknown> = { podStatus: "Submitted", podSubmittedAt: at };
      if (to) set.podSubmittedTo = to;
      if (note) set.podRemarks = note;
      return {
        ok: true,
        change: {
          from,
          to: "Submitted",
          set,
          unset: [],
          note: podHistoryNote(from, "Submitted", [to && `to ${to}`, note].filter(Boolean).join(" — ")),
        },
      };
    }

    case "rollback": {
      if (from === "Pending") return fail("INVALID_TRANSITION", "POD is already Pending.");
      if (from === "Submitted") {
        return {
          ok: true,
          change: {
            from,
            to: "Received",
            set: { podStatus: "Received" },
            unset: ["podSubmittedAt", "podSubmittedTo"],
            note: podHistoryNote(from, "Received", "rolled back"),
          },
        };
      }
      return {
        ok: true,
        change: {
          from,
          to: "Pending",
          set: { podStatus: "Pending" },
          unset: ["podReceivedAt"],
          note: podHistoryNote(from, "Pending", "rolled back"),
        },
      };
    }
  }
}

/** The previous step a rollback would go to, or null when there is nothing to roll back. */
export function rollbackTarget(podStatus: PodStatus): PodStatus | null {
  return podStatus === "Submitted" ? "Received" : podStatus === "Received" ? "Pending" : null;
}

/* --------------------------------- ageing --------------------------------- */

interface DeliveredFields {
  deliveredAt?: Date | string | null;
  statusHistory?: { status?: string; at?: Date | string | null }[] | null;
}

/** When the LR was delivered: `deliveredAt`, else the latest "Delivered" history entry, else unknown. */
export function deliveredSince(lr: DeliveredFields): Date | null {
  const direct = toDate(lr.deliveredAt);
  if (direct) return direct;
  const history = Array.isArray(lr.statusHistory) ? lr.statusHistory : [];
  let latest: Date | null = null;
  for (const entry of history) {
    if (entry?.status !== "Delivered") continue;
    const d = toDate(entry.at);
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

/** Whole days a delivered LR has been waiting for its POD; null if it isn't waiting or the date is unknown. */
export function podDaysPending(
  lr: DeliveredFields & { status?: unknown; podStatus?: unknown },
  now: Date = new Date()
): number | null {
  if (lr.status !== "Delivered" || getPodStatus(lr) !== "Pending") return null;
  const since = deliveredSince(lr);
  if (!since) return null;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS));
}

export type PodAgeLevel = "fresh" | "aging" | "overdue";

/** 0–3 days is fine, 4–7 is getting old, more than 7 is overdue. */
export function podAgeLevel(days: number): PodAgeLevel {
  return days <= 3 ? "fresh" : days <= 7 ? "aging" : "overdue";
}

export function podAgeLabel(days: number): string {
  return days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
}
