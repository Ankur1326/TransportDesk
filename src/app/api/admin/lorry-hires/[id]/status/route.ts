import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/lib/db";
import LorryHireModel from "@/models/LorryHire";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { LORRY_HIRE_STATUSES } from "@/lib/lorry-hire/constants";
import { canCancelLorryHire, canTransitionLorryHire } from "@/lib/lorry-hire/status";
import { fail, isObjectId, itemConsignmentIds, syncConsignmentLinks } from "@/lib/lorry-hire/server";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  status: z.enum(LORRY_HIRE_STATUSES),
  /** Optional note; becomes the cancel reason when cancelling. */
  note: z.string().trim().max(300).optional().default(""),
});

/** POST /api/admin/lorry-hires/[id]/status — lifecycle moves and cancellation. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid contract id.", 400);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data.", 400);
  const { status: next, note } = parsed.data;

  try {
    await dbConnect();
    const scope = companyFilter(auth.companyId);
    const existing = await LorryHireModel.findOne({ $and: [scope, { _id: id }] }).lean();
    if (!existing) return fail("Lorry hire contract not found.", 404);

    if (existing.status === next) return NextResponse.json({ success: true, data: existing });
    if (!canTransitionLorryHire(existing.status, next)) {
      return fail(`A ${existing.status.toLowerCase()} contract can't be moved to ${next.toLowerCase()}.`, 409);
    }

    const cancelling = next === "Cancelled";
    if (cancelling) {
      const check = canCancelLorryHire(existing.status, existing.settlement.totalPaid);
      if (!check.ok) return fail(check.reason ?? "This contract can't be cancelled.", 409);
    }

    const at = new Date();
    // The filter repeats the status (and, for cancel, "nothing paid") so a
    // concurrent change or payment can't slip through between read and write.
    const updated = await LorryHireModel.findOneAndUpdate(
      {
        $and: [
          scope,
          { _id: id, status: existing.status },
          ...(cancelling ? [{ "settlement.totalPaid": 0 }] : []),
        ],
      },
      {
        $set: {
          status: next,
          ...(cancelling ? { cancelledAt: at, cancelReason: note } : {}),
        },
        $push: { statusHistory: { status: next, at, by: auth.userId, ...(note ? { note } : {}) } },
      },
      { new: true }
    )
      .select("-driverSignature -pdfCache")
      .lean();
    if (!updated) return fail("This contract changed. Refresh and try again.", 409);

    // A cancelled contract no longer carries its LRs.
    if (cancelling) {
      await syncConsignmentLinks(auth.companyId, updated._id, updated.lhcNo, [], itemConsignmentIds(updated.items));
    }

    return NextResponse.json({ success: true, message: `Marked as ${next}`, data: updated });
  } catch (error) {
    console.error("Error while changing lorry hire status:", error);
    return fail("Error changing status", 500);
  }
}
