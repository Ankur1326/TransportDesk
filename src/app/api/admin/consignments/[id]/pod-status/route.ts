import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { DEFAULT_LR_STATUS, isLrStatus } from "@/lib/consignment-status";
import {
  POD_NOTE_MAX, POD_SUBMITTED_TO_MAX, applyPodAction, getPodStatus, podDaysPending, podStatusMatch, type PodAction,
} from "@/lib/pod-status";

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ success: false, message, ...extra }, { status });

const isoDay = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date.");

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("receive"), remark: z.string().trim().max(POD_NOTE_MAX).optional() }).strict(),
  z
    .object({
      action: z.literal("submit"),
      submittedAt: isoDay.optional(),
      submittedTo: z.string().trim().max(POD_SUBMITTED_TO_MAX).optional(),
      note: z.string().trim().max(POD_NOTE_MAX).optional(),
    })
    .strict(),
  z.object({ action: z.literal("rollback") }).strict(),
]);

/**
 * PATCH /api/admin/consignments/:id/pod-status
 *   { action: "receive", remark? }                       Pending -> Received (remark required without a file)
 *   { action: "submit", submittedAt?, submittedTo?, note? }  Received -> Submitted
 *   { action: "rollback" }                               Submitted -> Received -> Pending
 * Only a Delivered LR can change POD status. Each change adds a statusHistory entry.
 * (Uploading a file goes through POST .../pod, which sets Received itself.)
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid consignment id", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 400, { errors: parsed.error.flatten() });

  await dbConnect();

  const scope = { _id: id, ...companyFilter(auth.companyId) };
  const lr = await ConsignmentModel.findOne(scope).select("status podStatus podUrl podReceivedAt").lean();
  if (!lr) return fail("Consignment not found", 404);

  const lrStatus = isLrStatus(lr.status) ? lr.status : DEFAULT_LR_STATUS;
  const input = parsed.data;
  const action: PodAction =
    input.action === "receive"
      ? { type: "receive", remark: input.remark }
      : input.action === "submit"
        ? { type: "submit", submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined, submittedTo: input.submittedTo, note: input.note }
        : { type: "rollback" };

  const now = new Date();
  const result = applyPodAction(
    { lrStatus, podStatus: lr.podStatus, hasFile: Boolean(lr.podUrl), podReceivedAt: lr.podReceivedAt },
    action,
    now
  );
  if (!result.ok) {
    const status = result.code === "REMARK_REQUIRED" || result.code === "INVALID_DATE" ? 400 : 409;
    return fail(result.message, status, { code: result.code });
  }

  const { change } = result;
  const update: Record<string, unknown> = {
    $push: { statusHistory: { status: lrStatus, at: now, by: auth.userId, note: change.note } },
  };
  if (Object.keys(change.set).length) update.$set = change.set;
  if (change.unset.length) update.$unset = Object.fromEntries(change.unset.map((f) => [f, ""]));

  try {
    // Pinned to the POD status we validated against, so two people clicking at once can't both win.
    const doc = await ConsignmentModel.findOneAndUpdate(
      { ...scope, status: "Delivered", ...podStatusMatch(getPodStatus(lr)) },
      update,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return fail("This LR's POD status just changed. Refresh and try again.", 409, { code: "CONFLICT" });

    return NextResponse.json(
      { success: true, message: `POD ${change.to}`, data: { ...doc, podDaysPending: podDaysPending(doc, now) } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while updating POD status:", error);
    return fail("Error updating POD status", 500);
  }
}
