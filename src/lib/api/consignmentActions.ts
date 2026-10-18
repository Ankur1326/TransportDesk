import axios from "axios";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import { LR_STATUSES, type LrStatus } from "@/lib/consignment-status";

export { LR_STATUSES };
export type { LrStatus };

/** Fields accepted by PATCH /api/admin/consignments/:id (anything else is rejected). */
export interface ConsignmentPatch {
  status?: LrStatus;
  cancelReason?: string;
  "payment.status"?: "Pending" | "Partially Paid" | "Paid" | "Cancelled";
  "payment.receivedMoney"?: string;
  "payment.receivedDate"?: string;
  "payment.receivedType"?: "Cash" | "NEFT" | "Check" | "";
  "payment.UTRNumber"?: string;
  "payment.mrNumber"?: string;
  "payment.mrDate"?: string;
}

const BASE = "/api/admin/consignments";

export const patchConsignment = (id: string, patch: ConsignmentPatch) =>
  axios.patch<{ success: boolean; data: ConsignmentListItem }>(`${BASE}/${id}`, patch).then((r) => r.data);

/** Move an LR to a new status. `reason` is stored when cancelling. */
export const changeLrStatus = (id: string, status: LrStatus, reason?: string) =>
  patchConsignment(id, status === "Cancelled" ? { status, cancelReason: reason ?? "" } : { status });

/**
 * Upload (or replace) the proof of delivery. By default the server also moves
 * a Booked / On Route LR to Delivered — pass `markDelivered: false` to skip that.
 */
export const uploadPod = (id: string, file: File, opts: { markDelivered?: boolean } = {}) => {
  const body = new FormData();
  body.append("file", file);
  if (opts.markDelivered === false) body.append("markDelivered", "false");
  return axios
    .post<{ success: boolean; data: ConsignmentListItem }>(`${BASE}/${id}/pod`, body)
    .then((r) => r.data);
};

export const removePod = (id: string) => axios.delete(`${BASE}/${id}/pod`).then((r) => r.data);
