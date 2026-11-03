import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { aggregateVehicles, matchesSearch } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts, paginate, reportQuerySchema } from "@/lib/lorry-hire/load-fleet-reports";
import VehicleModel from "@/models/Vehicle";
import { companyFilter } from "@/lib/company-scope";
import { normalizeVehicleNumber } from "@/lib/lorry-hire/constants";

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
      VehicleModel.find(companyFilter(auth.companyId)).select("registrationNumber truckType ownership status").lean(),
    ]);
    const derived = aggregateVehicles(contracts);
    const derivedByNumber = new Map(derived.map((row) => [normalizeVehicleNumber(row.vehicleNumber), row]));
    const masterNumbers = new Set(masters.map((vehicle) => normalizeVehicleNumber(vehicle.registrationNumber)));
    const all = [
      ...masters.map((vehicle) => {
        const key = normalizeVehicleNumber(vehicle.registrationNumber);
        const summary = derivedByNumber.get(key);
        return {
          vehicleNumber: key,
          truckType: vehicle.truckType || summary?.truckType,
          trips: summary?.trips ?? 0,
          totalHire: summary?.totalHire ?? 0,
          lastHired: summary?.lastHired ?? "",
          lastDriver: summary?.lastDriver,
          lastDriverMobile: summary?.lastDriverMobile,
          owner: summary?.owner,
          suppliers: summary?.suppliers ?? [],
          ownership: vehicle.ownership,
          status: vehicle.status,
        };
      }),
      ...derived.filter((row) => !masterNumbers.has(normalizeVehicleNumber(row.vehicleNumber))),
    ];
    const filtered = q.search ? all.filter((v) => matchesSearch(q.search, v.vehicleNumber, v.truckType, v.lastDriver, v.owner, ...v.suppliers)) : all;
    const page = paginate(filtered, q.currentPage, q.itemsPerPage);
    return Response.json({
      success: true,
      rows: page.rows,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
      currentPage: q.currentPage,
    });
  } catch (error) {
    console.error("Lorry hire vehicles error:", error);
    return Response.json({ success: false, message: "Failed to load vehicles." }, { status: 500 });
  }
}
