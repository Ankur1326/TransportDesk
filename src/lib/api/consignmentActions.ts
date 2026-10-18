import axios from "axios";

export type LrStatus = "Booked" | "On Route" | "Delivered" | "Cancelled";

export const patchConsignment = (id: string, patch: Record<string, unknown>) =>
  axios.patch(`/api/admin/consignments/${id}`, patch).then((r) => r.data);

export const uploadPod = (id: string, file: File) => {
  const body = new FormData();
  body.append("file", file);
  return axios.post(`/api/admin/consignments/${id}/pod`, body).then((r) => r.data);
};