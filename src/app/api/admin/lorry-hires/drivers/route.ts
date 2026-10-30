import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { aggregateDrivers, matchesSearch } from "@/lib/lorry-hire/fleet-reports";
import { loadReportContracts, paginate, reportQuerySchema } from "@/lib/lorry-hire/load-fleet-reports";

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
    const contracts = await loadReportContracts(auth.companyId, q);
    const all = aggregateDrivers(contracts);
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
