import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import dbConnect from "@/lib/db";
import ConsignmentModel from "@/models/Consignment";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { destroyAsset, isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";
import { sniffFile } from "@/lib/file-sniff";
import { DEFAULT_LR_STATUS, isLrStatus } from "@/lib/consignment-status";

export const runtime = "nodejs";

// Serverless hosts (e.g. Vercel) reject request bodies above ~4.5 MB.
const MAX_MB = Number(process.env.POD_MAX_MB) || 4;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

/**
 * POST /api/admin/consignments/:id/pod   (multipart/form-data)
 *   file          image (jpg/png/webp) or PDF, up to POD_MAX_MB (default 4)
 *   markDelivered "false" to skip the automatic Booked/On Route -> Delivered move
 * Uploading again replaces the previous POD.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid consignment id", 400);

  if (!isCloudinaryConfigured()) {
    return fail("POD storage is not configured. Set the CLOUDINARY_* environment variables.", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart form upload.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.", 400);
  if (file.size > MAX_BYTES) return fail(`File is too large. Maximum size is ${MAX_MB} MB.`, 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniffFile(buffer);
  if (!type) return fail("Only JPG, PNG, WebP or PDF files are allowed.", 415);

  await dbConnect();

  const lr = await ConsignmentModel.findOne({ _id: id, ...companyFilter(auth.companyId) })
    .select("status podPublicId podResourceType consignmentNumber")
    .lean();
  if (!lr) return fail("Consignment not found", 404);

  const current = isLrStatus(lr.status) ? lr.status : DEFAULT_LR_STATUS;
  if (current === "Cancelled") return fail("A cancelled LR can't have a POD.", 409);

  try {
    const uploaded = await uploadBuffer(buffer, {
      folder: `lr-pod/${auth.companyId}`,
      publicId: `${String(lr.consignmentNumber).replace(/[^\w-]/g, "_")}-${randomUUID()}`,
    });

    const now = new Date();
    const $set: Record<string, unknown> = {
      podUrl: uploaded.secure_url,
      podPublicId: uploaded.public_id,
      podResourceType: uploaded.resource_type,
      podFileName: (file.name || `pod.${type.ext}`).slice(0, 120),
      podUploadedAt: now,
    };
    const update: Record<string, unknown> = { $set };

    if (form.get("markDelivered") !== "false" && (current === "Booked" || current === "On Route")) {
      $set.status = "Delivered";
      $set.deliveredAt = now;
      update.$push = { statusHistory: { status: "Delivered", at: now, by: auth.userId, note: "POD uploaded" } };
    }

    const doc = await ConsignmentModel.findOneAndUpdate(
      { _id: id, ...companyFilter(auth.companyId) },
      update,
      { new: true }
    ).lean();

    // Remove the replaced file only after the new one is safely saved.
    if (lr.podPublicId && lr.podPublicId !== uploaded.public_id) {
      void destroyAsset(lr.podPublicId, lr.podResourceType || "image");
    }

    return NextResponse.json({ success: true, message: "POD uploaded", data: doc }, { status: 200 });
  } catch (error) {
    console.error("POD upload failed:", error);
    return fail("Couldn't upload the POD. Please try again.", 502);
  }
}

/** DELETE /api/admin/consignments/:id/pod — remove the POD (status is left unchanged). */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid consignment id", 400);

  await dbConnect();

  const lr = await ConsignmentModel.findOneAndUpdate(
    { _id: id, ...companyFilter(auth.companyId) },
    { $unset: { podUrl: "", podPublicId: "", podResourceType: "", podFileName: "", podUploadedAt: "" } },
    { new: false }
  )
    .select("podPublicId podResourceType")
    .lean();

  if (!lr) return fail("Consignment not found", 404);
  if (lr.podPublicId) await destroyAsset(lr.podPublicId, lr.podResourceType || "image");

  return NextResponse.json({ success: true, message: "POD removed" }, { status: 200 });
}
