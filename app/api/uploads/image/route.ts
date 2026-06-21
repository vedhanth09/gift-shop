import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, apiError } from "@/lib/api";
import {
  uploadImage,
  deleteImage,
  publicIdFromUrl,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * POST /api/uploads/image  (admin only)
 * Accepts a multipart form with a single `file` field, uploads it to
 * Cloudinary, and returns `{ url, publicId }`.
 *
 * NOTE: this route lives outside `/api/admin`, so middleware does NOT protect
 * it — the requireAdmin() check below is the only gate.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  if (!isCloudinaryConfigured()) {
    return apiError(
      "Image uploads are not configured. Set CLOUDINARY_* in .env.local.",
      503
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError("No file provided.", 400);
  }
  if (!ALLOWED.includes(file.type)) {
    return apiError("Unsupported image type. Use JPEG, PNG, WebP, or AVIF.", 400);
  }
  if (file.size > MAX_BYTES) {
    return apiError("Image is too large (max 5 MB).", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadImage(buffer, file.type);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return apiError(message, 502);
  }
}

/**
 * DELETE /api/uploads/image  (admin only)
 * Body: `{ publicId }` or `{ url }`. Removes an image from Cloudinary — used
 * when an admin discards an image before saving a product.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: { publicId?: unknown; url?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  let publicId =
    typeof body.publicId === "string" && body.publicId ? body.publicId : null;
  if (!publicId && typeof body.url === "string") {
    publicId = publicIdFromUrl(body.url);
  }
  if (!publicId) {
    return apiError("A publicId or Cloudinary url is required.", 400);
  }

  const ok = await deleteImage(publicId);
  return NextResponse.json({ ok });
}
