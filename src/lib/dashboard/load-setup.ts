import dbConnect from "@/lib/db";
import { scopedMatch } from "@/lib/dashboard/shared";
import { setupPartyMatch } from "@/lib/dashboard/loader-scopes";
import type { SetupState } from "@/lib/dashboard/types";
import CompanySettings from "@/models/CompanySettings";
import ConsignmentModel from "@/models/Consignment";
import Customer from "@/models/Customer";
import FreightBillModel from "@/models/Bill";

export interface SetupLoad {
  setup: SetupState;
}

export async function loadSetup(companyId: string): Promise<SetupLoad> {
  await dbConnect();
  const [customers, consignments, bills, settings] = await Promise.all([
    Customer.exists(setupPartyMatch(companyId)),
    ConsignmentModel.exists(scopedMatch(companyId)),
    FreightBillModel.exists(scopedMatch(companyId)),
    CompanySettings.findOne({ ownerId: companyId }).select("companyName").lean(),
  ]);
  const companyName = settings?.companyName?.trim() || null;
  const setup = {
    hasCustomers: Boolean(customers),
    hasConsignments: Boolean(consignments),
    hasBills: Boolean(bills),
    hasCompanyName: Boolean(companyName),
    isNewCompany: !customers && !consignments && !bills,
  };
  return {
    setup,
  };
}
