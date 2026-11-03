import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import VehicleModel from "@/models/Vehicle";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { normalizeVehicleNumber } from "@/lib/lorry-hire/constants";
import { fail } from "@/lib/lorry-hire/server";
import { getDocumentStatus } from "@/lib/document-status";
import { VEHICLE_DOCUMENT_KEYS } from "@/lib/fleet-types";
import { loadCompanySettings } from "@/lib/company-settings-server";

/**
 * GET /api/admin/lorry-hires/lookup?vehicle=MH23AU6718
 * The most recent contract for this truck, so the form can offer
 * "use last details" (driver, owner, truck, insurance, supplier, bank).
 * `data` is null when the truck hasn't been hired before.
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const vehicle = normalizeVehicleNumber(new URL(request.url).searchParams.get("vehicle") ?? "");
  if (vehicle.length < 6) return fail("Enter the full vehicle number.", 400);

  try {
    await dbConnect();
    const [master, last, settings] = await Promise.all([
      VehicleModel.findOne({
        $and: [companyFilter(auth.companyId), { registrationNumber: vehicle }],
      }).lean(),
      LorryHireModel.findOne({
      $and: [companyFilter(auth.companyId), { "truck.vehicleNumber": vehicle, status: { $ne: "Cancelled" } }],
    })
      .sort({ lhcDate: -1, createdAt: -1 })
      .select("lhcNo lhcDate driver owner truck insurance supplier bank")
      .lean(),
      loadCompanySettings(auth.companyId),
    ]);

    const expiredDocuments = master
      ? [
          ...VEHICLE_DOCUMENT_KEYS.filter((key) =>
            getDocumentStatus(master.documents?.[key]?.expiresOn, new Date(), settings.docExpiryWarnDays) === "Expired"
          ).map((key) => key),
          ...(master.otherDocuments ?? [])
            .filter((document) => getDocumentStatus(document.expiresOn, new Date(), settings.docExpiryWarnDays) === "Expired")
            .map((document) => document.name),
        ]
      : last?.insurance?.validUpto &&
          getDocumentStatus(last.insurance.validUpto, new Date(), settings.docExpiryWarnDays) === "Expired"
        ? ["Insurance (latest LHC)"]
        : [];
    return NextResponse.json({
      success: true,
      data: { master: master ?? null, lastContract: last ?? null, expiredDocuments },
    });
  } catch (error) {
    console.error("Error looking up vehicle:", error);
    return fail("Error looking up vehicle", 500);
  }
}
