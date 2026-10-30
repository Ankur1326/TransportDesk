import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { buildTripProfit, matchesSearch } from "@/lib/lorry-hire/fleet-reports";
import { loadLrFreight, loadReportContracts, paginate, reportQuerySchema } from "@/lib/lorry-hire/load-fleet-reports";

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
    const lrFreight = await loadLrFreight(auth.companyId, contracts);
    const { rows, totals: allTotals } = buildTripProfit(contracts, lrFreight);

    const filtered = q.search
      ? rows.filter((r) => matchesSearch(q.search, r.lhcNo, r.supplierName, r.vehicleNumber, r.route))
      : rows;
    // Totals follow the search so the cards always match the table.
    const totals = q.search ? buildTripProfit(contracts.filter((c) => filtered.some((r) => r._id === c._id)), lrFreight).totals : allTotals;

    const page = paginate(filtered, q.currentPage, q.itemsPerPage);
    return Response.json({
      success: true,
      totals,
      rows: page.rows,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
      currentPage: q.currentPage,
    });
  } catch (error) {
    console.error("Trip profit report error:", error);
    return Response.json({ success: false, message: "Failed to load trip profit report." }, { status: 500 });
  }
}
