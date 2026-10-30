import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { escapeRegex } from "@/lib/escape-regex";
import { normalizeVehicleNumber, LORRY_HIRE_STATUSES, PAYMENT_STATUSES } from "@/lib/lorry-hire/constants";
import { LIST_EXCLUDE, fail, isObjectId } from "@/lib/lorry-hire/server";

/**
 * GET /api/admin/lorry-hires/get
 *
 * Query params (all optional): search, status, paymentStatus, supplierId,
 * vehicle, from, to (lhcDate range), page (default 1), limit (default 20, max 100).
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  await dbConnect();

  try {
    const sp = new URL(request.url).searchParams;
    const search = sp.get("search")?.trim();
    const status = sp.get("status") ?? "";
    const paymentStatus = sp.get("paymentStatus") ?? "";
    const supplierId = sp.get("supplierId") ?? "";
    const vehicle = sp.get("vehicle")?.trim() ?? "";
    const from = sp.get("from") ? new Date(sp.get("from") as string) : null;
    const to = sp.get("to") ? new Date(sp.get("to") as string) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return fail("Invalid date filter.", 400);
    }
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));

    const and: Record<string, unknown>[] = [companyFilter(auth.companyId)];
    if ((LORRY_HIRE_STATUSES as readonly string[]).includes(status)) and.push({ status });
    if ((PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)) and.push({ "settlement.paymentStatus": paymentStatus });
    if (supplierId) {
      if (!isObjectId(supplierId)) return fail("Invalid supplier.", 400);
      and.push({ "supplier.supplierId": supplierId });
    }
    if (vehicle) and.push({ "truck.vehicleNumber": new RegExp(escapeRegex(normalizeVehicleNumber(vehicle))) });
    if (from || to) and.push({ lhcDate: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } });
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const squashed = normalizeVehicleNumber(search);
      and.push({
        $or: [
          { lhcNo: regex },
          { "supplier.name": regex },
          { "driver.name": regex },
          { "from.location": regex },
          { "to.location": regex },
          { "items.cnNo": regex },
          ...(squashed ? [{ "truck.vehicleNumber": new RegExp(escapeRegex(squashed)) }] : []),
        ],
      });
    }
    const query = { $and: and };

    const [rows, total] = await Promise.all([
      LorryHireModel.find(query)
        .select(LIST_EXCLUDE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LorryHireModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      message: "Lorry hire contracts fetched successfully",
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("Error while fetching lorry hire contracts:", error);
    return fail("Error fetching lorry hire contracts", 500);
  }
}
