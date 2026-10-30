import { NextRequest } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { isObjectId } from "@/lib/ledger/load-ledger";
import { loadSupplierLedger } from "@/lib/lorry-hire/load-supplier-ledger";
import { filterEntries } from "@/lib/lorry-hire/supplier-ledger";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const dateParam = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

const querySchema = z.object({
  from: dateParam,
  to: dateParam,
  type: z.enum(["all", "payable", "paid"]).default("all"),
  currentPage: z.coerce.number().int().min(1).default(1),
  itemsPerPage: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) {
    return Response.json({ success: false, message: "Invalid supplier id." }, { status: 400 });
  }
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
    const result = await loadSupplierLedger(auth.companyId, id);
    if (!result) return Response.json({ success: false, message: "Supplier not found." }, { status: 404 });

    const { ledger } = result;
    // Newest first for display; running balances stay from the full history.
    const filtered = filterEntries(ledger.entries, q.from, q.to, q.type).reverse();
    const start = (q.currentPage - 1) * q.itemsPerPage;

    return Response.json({
      success: true,
      supplier: result.supplier,
      summary: {
        totalPayable: ledger.totalPayable,
        totalPaid: ledger.totalPaid,
        balance: ledger.balance,
      },
      ageing: ledger.ageing,
      contracts: ledger.contracts.filter((c) => c.outstanding > 0),
      entries: filtered.slice(start, start + q.itemsPerPage),
      totalEntries: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / q.itemsPerPage)),
      currentPage: q.currentPage,
    });
  } catch (error) {
    console.error("Supplier ledger error:", error);
    return Response.json({ success: false, message: "Failed to load supplier ledger." }, { status: 500 });
  }
}
