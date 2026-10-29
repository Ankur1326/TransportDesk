import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

let configured = false;

/** True when the env vars needed for uploads are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

function configure() {
  if (configured) return;
  // CLOUDINARY_URL (cloudinary://key:secret@cloud) is picked up by the SDK automatically.
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  cloudinary.config({ secure: true });
  configured = true;
}

export function uploadBuffer(
  buffer: Buffer,
  opts: { folder: string; publicId: string }
): Promise<UploadApiResponse> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: opts.folder, public_id: opts.publicId, resource_type: "auto", overwrite: false },
      (error, result) => (error || !result ? reject(error ?? new Error("Upload failed")) : resolve(result))
    );
    stream.end(buffer);
  });
}

/** Best-effort delete — never throws, so a stale asset can't block a DB change. */
export async function destroyAsset(publicId: string, resourceType = "image"): Promise<void> {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    configure();
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (error) {
    console.error("Cloudinary destroy failed:", error);
  }
}

/**
 * Stores a generated PDF at a fixed public id (re-uploading replaces it).
 * Uploaded as a `raw` asset; the returned secure_url carries a version, so
 * the CDN never serves an older copy after an overwrite.
 *
 * NOTE: Cloudinary blocks PDF delivery on new accounts by default — enable
 * Settings -> Security -> "PDF and ZIP files delivery".
 */
export function uploadPdf(buffer: Buffer, opts: { publicId: string }): Promise<UploadApiResponse> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: opts.publicId, resource_type: "raw", overwrite: true, invalidate: true },
      (error, result) => (error || !result ? reject(error ?? new Error("PDF upload failed")) : resolve(result))
    );
    stream.end(buffer);
  });
}
