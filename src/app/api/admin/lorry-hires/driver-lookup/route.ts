import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { getDocumentStatus } from "@/lib/document-status";
import { aggregateDrivers } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts } from "@/lib/lorry-hire/load-fleet-reports";
import { loadCompanySettings } from "@/lib/company-settings-server";
import DriverModel from "@/models/Driver";

const digits = (value: string) => value.replace(/\D/g, "").slice(-10);

export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const search = request.nextUrl.searchParams;
  const mobile = digits(search.get("mobile") ?? "");
  const name = (search.get("name") ?? "").trim();
  if (mobile.length < 10 && !name) {
    return NextResponse.json({ success: false, message: "Enter a driver name or full mobile number." }, { status: 400 });
  }

  try {
    await dbConnect();
    const [drivers, contracts, settings] = await Promise.all([
      DriverModel.find(companyFilter(auth.companyId)).select("name mobile licenseNumber licenseClass licenseExpiry status").lean(),
      loadReportContracts(auth.companyId, { from: null, to: null }),
      loadCompanySettings(auth.companyId),
    ]);
    const master = drivers.find((driver) =>
      mobile.length === 10
        ? digits(driver.mobile) === mobile
        : driver.name.toLowerCase() === name.toLowerCase()
    ) ?? null;
    const derived = master ? null : aggregateDrivers(contracts).find((driver) =>
      mobile.length === 10
        ? driver.mobile === mobile
        : driver.name.toLowerCase() === name.toLowerCase()
    ) ?? null;
    const licenseExpiry = master?.licenseExpiry ?? derived?.licenseExpiry;
    const expiredDocuments = licenseExpiry &&
      getDocumentStatus(licenseExpiry, new Date(), settings.docExpiryWarnDays) === "Expired"
      ? ["Driving licence"]
      : [];

    return NextResponse.json({ success: true, data: { master, derived, expiredDocuments } });
  } catch (error) {
    console.error("Driver lookup failed:", error);
    return NextResponse.json({ success: false, message: "Unable to look up this driver." }, { status: 500 });
  }
}
