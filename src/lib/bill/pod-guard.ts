import ConsignmentModel from "@/models/Consignment";
import CompanySettings from "@/models/CompanySettings";
import { companyFilter } from "@/lib/company-scope";
import { isPodCleared } from "@/lib/pod-status";

/** The `requirePodBeforeBilling` setting (false when unset, e.g. legacy companies). */
export async function isPodRequiredForBilling(companyId: string): Promise<boolean> {
  const settings = await CompanySettings.findOne({ ownerId: companyId }).select("requirePodBeforeBilling").lean();
  return settings?.requirePodBeforeBilling === true;
}

/** LR numbers among `consignmentIds` whose POD hasn't been Received or Submitted. */
export async function lrNumbersMissingPod(companyId: string, consignmentIds: string[]): Promise<string[]> {
  if (consignmentIds.length === 0) return [];
  const rows = await ConsignmentModel.find({ _id: { $in: [...new Set(consignmentIds)] }, ...companyFilter(companyId) })
    .select("consignmentNumber podStatus")
    .lean();
  return rows.filter((r) => !isPodCleared(r)).map((r) => String(r.consignmentNumber));
}

/** Message for the 409 returned when billing is blocked. */
export function podRequiredMessage(lrNumbers: string[]): string {
  const shown = lrNumbers.slice(0, 5).join(", ");
  const more = lrNumbers.length > 5 ? ` and ${lrNumbers.length - 5} more` : "";
  return `POD is required before billing. Receive the POD for LR ${shown}${more} first, or turn this rule off in Settings.`;
}
