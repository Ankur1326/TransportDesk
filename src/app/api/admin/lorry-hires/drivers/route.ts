import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { aggregateDrivers, matchesSearch } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts, paginate, reportQuerySchema } from "@/lib/lorry-hire/load-fleet-reports";
import DriverModel from "@/models/Driver";
import { companyFilter } from "@/lib/company-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const parsed = reportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    );
  }
  const q = parsed.data;

  try {
    await dbConnect();
    const [contracts, masters] = await Promise.all([
      loadReportContracts(auth.companyId, q),
      DriverModel.find(companyFilter(auth.companyId)).select("name mobile licenseNumber status").lean(),
    ]);
    const derived = aggregateDrivers(contracts);
    const digits = (value: string) => value.replace(/\D/g, "").slice(-10);
    const derivedByMobile = new Map(derived.filter((row) => row.mobile).map((row) => [digits(row.mobile!), row]));
    const masterMobiles = new Set(masters.map((driver) => digits(driver.mobile)).filter((mobile) => mobile.length === 10));
    const all = [
      ...masters.map((driver) => {
        const mobile = digits(driver.mobile);
        const summary = mobile.length === 10 ? derivedByMobile.get(mobile) : undefined;
        return {
          key: summary?.key ?? (mobile.length === 10 ? `m:${mobile}` : `n:${driver.name.toLowerCase()}`),
          name: driver.name || summary?.name || "Unnamed driver",
          mobile: mobile || undefined,
          licenseNumber: driver.licenseNumber || summary?.licenseNumber,
          trips: summary?.trips ?? 0,
          vehicles: summary?.vehicles ?? [],
          lastTrip: summary?.lastTrip ?? "",
          status: driver.status,
        };
      }),
      ...derived.filter((row) => !row.mobile || !masterMobiles.has(digits(row.mobile))),
    ];
    const filtered = q.search ? all.filter((v) => matchesSearch(q.search, v.name, v.mobile, v.licenseNumber, ...v.vehicles)) : all;
    const page = paginate(filtered, q.currentPage, q.itemsPerPage);
    return Response.json({
      success: true,
      rows: page.rows,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
      currentPage: q.currentPage,
    });
  } catch (error) {
    console.error("Lorry hire drivers error:", error);
    return Response.json({ success: false, message: "Failed to load drivers." }, { status: 500 });
  }
}
