import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { companyFilter, requireCompany } from "@/lib/company-scope";
import { destroyAsset, isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";
import { VEHICLE_DOCUMENT_KEYS } from "@/lib/fleet-types";
import VehicleModel from "@/models/Vehicle";
import { sniffFile } from "@/lib/file-sniff";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
type Context = { params: Promise<{ id: string }> };
const fail = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Invalid vehicle id.");
  if (!isCloudinaryConfigured()) return fail("Document storage is not configured.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart file upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a document file.");
  if (file.size > MAX_FILE_BYTES) return fail("The document must be no larger than 4 MB.", 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!sniffFile(buffer)) return fail("Only JPG, PNG, WebP, or PDF files are allowed.", 415);

  const documentKey = form.get("documentKey");
  const documentId = form.get("documentId");
  const isVehicleDocument = typeof documentKey === "string" &&
    (VEHICLE_DOCUMENT_KEYS as readonly string[]).includes(documentKey);
  const isOtherDocument = documentKey === "otherDocuments" && typeof documentId === "string" &&
    mongoose.isValidObjectId(documentId);
  if (!isVehicleDocument && !isOtherDocument) return fail("Select a valid vehicle document.");

  let uploaded: Awaited<ReturnType<typeof uploadBuffer>> | undefined;
  try {
    await dbConnect();
    const vehicle = await VehicleModel.findOne({ _id: id, ...companyFilter(auth.companyId) });
    if (!vehicle) return fail("Vehicle not found.", 404);
    if (isOtherDocument && !vehicle.otherDocuments.some((document) => String(document._id) === documentId)) {
      return fail("Other document not found.", 404);
    }

    uploaded = await uploadBuffer(buffer, {
      folder: `fleet/${auth.companyId}/vehicles/${id}`,
      publicId: randomUUID(),
    });

    let previousPublicId = "";
    let previousResourceType = "image";
    if (isVehicleDocument) {
      const key = documentKey as (typeof VEHICLE_DOCUMENT_KEYS)[number];
      const document = vehicle.documents[key];
      if (document) {
        previousPublicId = document.filePublicId;
        previousResourceType = document.fileUrl.includes("/raw/upload/") ? "raw" : "image";
        document.fileUrl = uploaded.secure_url;
        document.filePublicId = uploaded.public_id;
      } else {
        vehicle.set(`documents.${key}`, { fileUrl: uploaded.secure_url, filePublicId: uploaded.public_id });
      }
    } else {
      const document = vehicle.otherDocuments.find((entry) => String(entry._id) === documentId);
      if (!document) return fail("Other document not found.", 404);
      previousPublicId = document.filePublicId;
      previousResourceType = document.fileUrl.includes("/raw/upload/") ? "raw" : "image";
      document.fileUrl = uploaded.secure_url;
      document.filePublicId = uploaded.public_id;
    }
    await vehicle.save();
    if (previousPublicId && previousPublicId !== uploaded.public_id) {
      await destroyAsset(previousPublicId, previousResourceType);
    }
    return NextResponse.json({ success: true, data: { fileUrl: uploaded.secure_url, filePublicId: uploaded.public_id } });
  } catch (error) {
    if (uploaded) await destroyAsset(uploaded.public_id, uploaded.resource_type);
    console.error("Fleet document upload failed:", error);
    return fail("Unable to upload the document.", 502);
  }
}
