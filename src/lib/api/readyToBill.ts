import axios from "axios";
import type { ConsignmentListItem } from "@/lib/api/consignments";
import type { PartyGroup } from "@/lib/ready-to-bill";

export type ReadyToBillGroup = PartyGroup<ConsignmentListItem>;

export interface ReadyToBillResult {
  groups: ReadyToBillGroup[];
  total: number;
  /** More LRs exist than were returned; narrow the search. */
  truncated: boolean;
}

/** Delivered LRs with a received POD that aren't billed yet, grouped by billing party. */
export async function getReadyToBill(params: { search?: string } = {}): Promise<ReadyToBillResult> {
  const { data } = await axios.get<{ success: boolean; data: ReadyToBillResult }>(
    "/api/admin/consignments/ready-to-bill",
    { params: { search: params.search || undefined } }
  );
  return data.data;
}
