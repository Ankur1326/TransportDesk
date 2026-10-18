import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import Bill from "@/models/Bill";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { destroyAsset } from "@/lib/cloudinary";
import { PAYMENT_STATUSES, RECEIVED_TYPES } from "@/lib/validations/billing";
import { DEFAULT_LR_STATUS, LR_STATUSES, canTransition, isLrStatus } from "@/lib/consignment-status";

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ success: false, message, ...extra }, { status });

const short = z.string().trim().max(60);
const money = z
  .string()
  .trim()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Enter a valid amount.");
const isoDay = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Enter a valid date.");

/**
 * Fields the list page may change in place. Anything else is rejected, so
 * identity, ownership and POD fields can't be overwritten through this route.
 * Payment fields use dotted keys to match what the UI already sends.
 */
const patchSchema = z
  .object({
    status: z.enum(LR_STATUSES),
    cancelReason: z.string().trim().max(200),
    "payment.status": z.enum(PAYMENT_STATUSES),
    "payment.receivedMoney": money,
    "payment.receivedDate": isoDay,
    "payment.receivedType": z.enum(RECEIVED_TYPES),
    "payment.UTRNumber": short,
    "payment.mrNumber": short,
    "payment.mrDate": isoDay,
  })
  .partial()
  .strict();

function validId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** PATCH /api/admin/consignments/:id */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!validId(id)) return fail("Invalid consignment id", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 400, { errors: parsed.error.flatten() });
  }
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) return fail("Nothing to update", 400);

  await dbConnect();

  const scope = { _id: id, ...companyFilter(auth.companyId) };
  const current = await ConsignmentModel.findOne(scope).select("status").lean();
  if (!current) return fail("Consignment not found", 404);

  const from = isLrStatus(current.status) ? current.status : DEFAULT_LR_STATUS;
  const $set: Record<string, unknown> = {};
  const update: Record<string, unknown> = { $set };

  const touchesPayment = Object.keys(patch).some((k) => k.startsWith("payment."));
  if (touchesPayment && from === "Cancelled") {
    return fail("A cancelled LR can't be edited.", 409);
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key === "status" || key === "cancelReason") continue;
    $set[key] = value;
  }

  if (patch.status && patch.status !== from) {
    if (!canTransition(from, patch.status)) {
      return fail(`Can't move an LR from ${from} to ${patch.status}.`, 409);
    }
    const now = new Date();
    $set.status = patch.status;
    if (patch.status === "Delivered") $set.deliveredAt = now;
    if (patch.status === "Cancelled") {
      $set.cancelledAt = now;
      $set.cancelReason = patch.cancelReason ?? "";
    }
    if (from === "Delivered") update.$unset = { deliveredAt: "" }; // rolled back to On Route
    update.$push = {
      statusHistory: {
        status: patch.status,
        at: now,
        by: auth.companyId,
        note: patch.status === "Cancelled" ? (patch.cancelReason ?? "") : "",
      },
    };
  } else if (patch.cancelReason !== undefined && from === "Cancelled") {
    $set.cancelReason = patch.cancelReason; // edit the reason of an already-cancelled LR
  }

  if (Object.keys($set).length === 0 && !update.$push) {
    // e.g. status already equals the requested one — treat as success, not an error.
    const unchanged = await ConsignmentModel.findOne(scope).lean();
    return NextResponse.json({ success: true, data: unchanged }, { status: 200 });
  }
  if (Object.keys($set).length === 0) delete update.$set;

  try {
    const doc = await ConsignmentModel.findOneAndUpdate(scope, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return fail("Consignment not found", 404);
    return NextResponse.json({ success: true, message: "Consignment updated", data: doc }, { status: 200 });
  } catch (error) {
    console.error("Error while patching consignment:", error);
    return fail("Error updating consignment", 500);
  }
}

/** DELETE /api/admin/consignments/:id */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!validId(id)) return fail("Invalid consignment id", 400);

  await dbConnect();

  try {
    const scope = { _id: id, ...companyFilter(auth.companyId) };
    const lr = await ConsignmentModel.findOne(scope).select("consignmentNumber podPublicId podResourceType").lean();
    if (!lr) return fail("Consignment not found", 404);

    // An LR that is on a freight bill must be removed from the bill first.
    const onBill = await Bill.exists({ "items.consignmentId": new mongoose.Types.ObjectId(id) });
    if (onBill) {
      return fail(`LR ${lr.consignmentNumber} is on a freight bill. Remove it from the bill before deleting.`, 409);
    }

    await ConsignmentModel.deleteOne(scope);
    if (lr.podPublicId) void destroyAsset(lr.podPublicId, lr.podResourceType || "image");

    return NextResponse.json({ success: true, message: "Consignment deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error while deleting consignment:", error);
    return fail("Error deleting consignment", 500);
  }
}
