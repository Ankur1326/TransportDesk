import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { getDocumentStatus } from "@/lib/document-status";
import { VEHICLE_DOCUMENT_KEYS } from "@/lib/fleet-types";
import { loadCompanySettings } from "@/lib/company-settings-server";
import VehicleModel from "@/models/Vehicle";
import DriverModel from "@/models/Driver";

export const dynamic = "force-dynamic";

const DOCUMENT_LABELS: Record<(typeof VEHICLE_DOCUMENT_KEYS)[number], string> = {
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  puc: "PUC",
  roadTax: "Road tax",
  nationalPermit: "National permit",
};

export async function GET() {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  try {
    await dbConnect();
    const [vehicles, drivers, settings] = await Promise.all([
      VehicleModel.find(companyFilter(auth.companyId)).select("registrationNumber documents otherDocuments").lean(),
      DriverModel.find(companyFilter(auth.companyId)).select("name licenseExpiry").lean(),
      loadCompanySettings(auth.companyId),
    ]);
    const today = new Date();
    const data = [
      ...vehicles.flatMap((vehicle) => [
        ...VEHICLE_DOCUMENT_KEYS.map((key) => {
          const document = vehicle.documents?.[key];
          const status = getDocumentStatus(document?.expiresOn, today, settings.docExpiryWarnDays);
          return document?.expiresOn && (status === "Expired" || status === "Expiring")
            ? {
                entityType: "Vehicle" as const,
                entityId: String(vehicle._id),
                entityName: vehicle.registrationNumber,
                documentName: DOCUMENT_LABELS[key],
                expiresOn: new Date(document.expiresOn).toISOString(),
                status,
              }
            : null;
        }),
        ...(vehicle.otherDocuments ?? []).map((document) => {
          const status = getDocumentStatus(document.expiresOn, today, settings.docExpiryWarnDays);
          return document.expiresOn && (status === "Expired" || status === "Expiring")
            ? {
                entityType: "Vehicle" as const,
                entityId: String(vehicle._id),
                entityName: vehicle.registrationNumber,
                documentName: document.name,
                expiresOn: new Date(document.expiresOn).toISOString(),
                status,
              }
            : null;
        }),
      ]),
      ...drivers.map((driver) => {
        const status = getDocumentStatus(driver.licenseExpiry, today, settings.docExpiryWarnDays);
        return driver.licenseExpiry && (status === "Expired" || status === "Expiring")
          ? {
              entityType: "Driver" as const,
              entityId: String(driver._id),
              entityName: driver.name,
              documentName: "Driving licence",
              expiresOn: new Date(driver.licenseExpiry).toISOString(),
              status,
            }
          : null;
      }),
    ]
      .flat()
      .filter((document): document is NonNullable<typeof document> => document !== null)
      .sort((a, b) => Date.parse(a.expiresOn) - Date.parse(b.expiresOn));
    return NextResponse.json({ success: true, data: { documents: data, warnDays: settings.docExpiryWarnDays } });
  } catch (error) {
    console.error("Fleet expiry list failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load expiring documents." }, { status: 500 });
  }
}
