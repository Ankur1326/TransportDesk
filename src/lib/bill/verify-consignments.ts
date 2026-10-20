import mongoose from "mongoose";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter } from "@/lib/company-scope";

/**
 * True only if every consignment id exists AND belongs to this company, so a
 * bill can never reference (and expose) another company's bilty.
 */
export async function allConsignmentsBelongToCompany(
  consignmentIds: string[],
  companyId: string
): Promise<boolean> {
  const unique = [...new Set(consignmentIds)];
  if (unique.some((id) => !mongoose.Types.ObjectId.isValid(id))) return false;
  const found = await ConsignmentModel.countDocuments({
    _id: { $in: unique },
    ...companyFilter(companyId),
  });
  return found === unique.length;
}
