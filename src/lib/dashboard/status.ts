import { DEFAULT_LR_STATUS } from "@/lib/consignment-status";

export function notCancelledMatch() {
  return { status: { $ne: "Cancelled" } };
}

export function legacyLrStatusExpression() {
  return { $ifNull: ["$status", DEFAULT_LR_STATUS] } as const;
}
