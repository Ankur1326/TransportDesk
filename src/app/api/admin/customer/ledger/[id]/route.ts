import { NextRequest } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { isObjectId, loadLedgers } from "@/lib/ledger/load-ledger";
import type { LedgerCustomer } from "@/lib/ledger/build-ledger";
import { computeAgeing } from "@/lib/ledger/ageing";

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
  type: z.enum(["all", "receivable", "received"]).default("all"),
  search: z.string().trim().max(100).default(""),
  includeUnbilled: z.enum(["true", "false"]).default("true"),
  currentPage: z.coerce.number().int().min(1).default(1),
  itemsPerPage: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) {
    return Response.json({ success: false, message: "Invalid customer id." }, { status: 400 });
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
    const doc = await Customer.findOne({ $and: [companyFilter(auth.companyId), { _id: id }] }).lean();
    if (!doc) return Response.json({ success: false, message: "Customer not found." }, { status: 404 });

    const customer: LedgerCustomer = {
      _id: String(doc._id),
      name: doc.name,
      openingBalance: doc.openingBalance ?? 0,
      balanceType: doc.balanceType ?? "debit",
      createdAt: doc.createdAt,
    };

    // `to` is inclusive of the whole day.
    const to = q.to ? new Date(q.to.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
    const ledgers = await loadLedgers(auth.companyId, [customer], {
      from: q.from,
      to,
      type: q.type,
      search: q.search,
      includeUnbilled: q.includeUnbilled === "true",
    });
    const ledger = ledgers.get(customer._id);
    if (!ledger) throw new Error("Ledger missing");

    const skip = (q.currentPage - 1) * q.itemsPerPage;
    return Response.json({
      success: true,
      message: "Ledger fetched successfully",
      data: {
        customer: {
          ...customer,
          mobile: doc.mobile,
          gstin: doc.gstin,
          address: doc.address,
          city: doc.city,
          state: doc.state,
          pincode: doc.pincode,
          email: doc.email,
        },
        summary: ledger.summary,
        entries: ledger.entries.slice(skip, skip + q.itemsPerPage),
        billStatuses: ledger.billStatuses,
        // Open invoices by age. Unfiltered, like billStatuses.
        ageing: computeAgeing(Object.values(ledger.billStatuses), new Date()),
        pagination: {
          currentPage: q.currentPage,
          itemsPerPage: q.itemsPerPage,
          totalEntries: ledger.entries.length,
          totalPages: Math.max(1, Math.ceil(ledger.entries.length / q.itemsPerPage)),
        },
      },
    });
  } catch (error) {
    console.error("Error while fetching ledger: ", error);
    return Response.json({ success: false, message: "Internal server error while fetching ledger" }, { status: 500 });
  }
}
