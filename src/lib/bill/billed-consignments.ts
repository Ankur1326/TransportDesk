import Bill from "@/models/Bill";
import { companyFilter } from "@/lib/company-scope";

/**
 * Ids (as strings) of this company's LRs that sit on a bill. A cancelled bill
 * doesn't count (bills have no cancel state today; the filter is for when they do).
 */
export async function billedConsignmentIds(companyId: string): Promise<string[]> {
  const ids = await Bill.distinct("items.consignmentId", {
    ...companyFilter(companyId),
    status: { $ne: "Cancelled" },
  });
  return ids.map(String);
}
