/** Must match the server's POD_MAX_MB default (4 MB). */
export const POD_MAX_BYTES = 4 * 1024 * 1024;

const MAX_EDGE = 2200;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Get a POD file under the upload limit. PDFs are only size-checked; photos
 * are downscaled and re-encoded as JPEG when they're too big (phone photos
 * are often 5-10 MB). Throws an Error with a user-friendly message.
 */
export async function preparePodFile(file: File): Promise<File> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > POD_MAX_BYTES) throw new Error("PDF is larger than 4 MB. Please upload a smaller file.");
    return file;
  }
  if (!file.type.startsWith("image/")) throw new Error("Only photos (JPG, PNG, WebP) or PDF files are allowed.");
  if (file.size <= POD_MAX_BYTES * 0.9) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format can't be read. Please upload a JPG, PNG or PDF.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process the image.");
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const q of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await toBlob(canvas, q);
    if (blob && blob.size <= POD_MAX_BYTES * 0.95) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("Image is too large even after compression. Please upload a smaller photo.");
}
