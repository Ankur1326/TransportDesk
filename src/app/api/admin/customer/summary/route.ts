import { NextRequest } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { escapeRegex } from "@/lib/escape-regex";
import { loadLedgers } from "@/lib/ledger/load-ledger";
import type { LedgerCustomer } from "@/lib/ledger/build-ledger";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  search: z.string().trim().max(100).default(""),
  includeUnbilled: z.enum(["true", "false"]).default("true"),
  currentPage: z.coerce.number().int().min(1).default(1),
  itemsPerPage: z.coerce.number().int().min(1).max(100).default(30),
});

/**
 * Net balance per customer for the left list. One page of customers is read,
 * then ALL their bills / payments / bilties are loaded with bulk queries (no
 * N+1) and run through the same buildLedger() as the ledger screen, so the
 * list and the ledger can never disagree.
 */
export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    );
  }
  const q = parsed.data;

  try {
    await dbConnect();
    const filter: Record<string, unknown> = {};
    if (q.search) {
      const rx = { $regex: escapeRegex(q.search), $options: "i" };
      filter.$or = [{ name: rx }, { mobile: rx }, { gstin: rx }];
    }
    const scoped = { $and: [companyFilter(auth.companyId), filter] };

    const [docs, total] = await Promise.all([
      Customer.find(scoped, "name mobile gstin openingBalance balanceType createdAt")
        .sort({ name: 1 })
        .skip((q.currentPage - 1) * q.itemsPerPage)
        .limit(q.itemsPerPage)
        .lean(),
      Customer.countDocuments(scoped),
    ]);

    const customers: LedgerCustomer[] = docs.map((d) => ({
      _id: String(d._id),
      name: d.name,
      openingBalance: d.openingBalance ?? 0,
      balanceType: d.balanceType ?? "debit",
      createdAt: d.createdAt,
    }));
    const ledgers = await loadLedgers(auth.companyId, customers, {
      includeUnbilled: q.includeUnbilled === "true",
    });

    return Response.json({
      success: true,
      message: "Customer balances fetched successfully",
      data: {
        customers: docs.map((d) => ({
          _id: String(d._id),
          name: d.name,
          mobile: d.mobile ?? null,
          gstin: d.gstin ?? "",
          netBalance: ledgers.get(String(d._id))?.summary.overallNetBalance ?? 0,
        })),
        totalCustomers: total,
        currentPage: q.currentPage,
        totalPages: Math.max(1, Math.ceil(total / q.itemsPerPage)),
      },
    });
  } catch (error) {
    console.error("Error while fetching customer balances: ", error);
    return Response.json({ success: false, message: "Internal server error while fetching balances" }, { status: 500 });
  }
}
