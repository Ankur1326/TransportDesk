import dbConnect from "@/lib/db";
import { collectionExists, scopedMatch } from "@/lib/dashboard/shared";
import { setupPartyMatch } from "@/lib/dashboard/loader-scopes";
import type { DashboardCapabilities, SetupState } from "@/lib/dashboard/types";
import CompanySettings from "@/models/CompanySettings";
import ConsignmentModel from "@/models/Consignment";
import Customer from "@/models/Customer";
import FreightBillModel from "@/models/Bill";
import VehicleModel from "@/models/Vehicle";
import DriverModel from "@/models/Driver";

export interface SetupLoad {
  company: { name: string | null };
  setup: SetupState;
  capabilities: DashboardCapabilities;
}

export async function loadSetup(companyId: string): Promise<SetupLoad> {
  await dbConnect();
  const [customers, consignments, bills, settings, vehicleMaster, driverMaster] = await Promise.all([
    Customer.exists(setupPartyMatch(companyId)),
    ConsignmentModel.exists(scopedMatch(companyId)),
    FreightBillModel.exists(scopedMatch(companyId)),
    CompanySettings.findOne({ ownerId: companyId }).select("companyName").lean(),
    collectionExists(VehicleModel.collection.name),
    collectionExists(DriverModel.collection.name),
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
    company: { name: companyName },
    setup,
    capabilities: {
      podStatus: Boolean(ConsignmentModel.schema.path("podStatus")),
      billingMarker: Boolean(ConsignmentModel.schema.path("billing.billed")),
      vehicleMaster,
      driverMaster,
    },
  };
}
