import { createHash } from "node:crypto";

/**
 * Minimal Cloudinary client built on the REST API + Node crypto, so we don't
 * pull in the full SDK (consistent with the project's hand-rolled helpers).
 *
 * Signed uploads/deletes only — the secret never leaves the server. All product
 * images live under a single folder so public_ids are predictable and the URL
 * parser below can round-trip them for deletion.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const UPLOAD_FOLDER = "giftly/products";

/** True only when all three Cloudinary credentials are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

function apiUrl(action: "upload" | "destroy"): string {
  return `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/${action}`;
}

/**
 * Cloudinary signature: the SHA-1 hex of the params to sign (sorted by key,
 * joined as `k=v&k=v`) concatenated with the API secret.
 */
function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + API_SECRET)
    .digest("hex");
}

export interface UploadResult {
  url: string; // secure HTTPS URL
  publicId: string; // includes folder, no extension
}

/** Upload an image buffer to Cloudinary. Throws if not configured. */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  const timestamp = Math.floor(currentTimeSeconds());
  const signature = sign({ folder: UPLOAD_FOLDER, timestamp });

  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const form = new FormData();
  form.append("file", dataUri);
  form.append("api_key", API_KEY!);
  form.append("timestamp", String(timestamp));
  form.append("folder", UPLOAD_FOLDER);
  form.append("signature", signature);

  const res = await fetch(apiUrl("upload"), { method: "POST", body: form });
  const data = (await res.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message || "Cloudinary upload failed.");
  }

  return { url: data.secure_url, publicId: data.public_id };
}

/**
 * Delete an image by its public_id. Best-effort: returns false (never throws)
 * when Cloudinary is unconfigured or the call fails, so product/image deletion
 * is never blocked by image cleanup.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured() || !publicId) return false;

  try {
    const timestamp = Math.floor(currentTimeSeconds());
    const signature = sign({ public_id: publicId, timestamp });

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", API_KEY!);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const res = await fetch(apiUrl("destroy"), { method: "POST", body: form });
    const data = (await res.json()) as { result?: string };
    return data.result === "ok";
  } catch {
    return false;
  }
}

/**
 * Derive the public_id from a Cloudinary secure_url. Strips everything up to
 * and including `/upload/`, an optional `v123456/` version segment, and the
 * file extension. Returns null when the URL isn't a Cloudinary upload URL.
 *
 * e.g. https://res.cloudinary.com/x/image/upload/v17000/giftly/products/abc.jpg
 *   →  giftly/products/abc
 */
export function publicIdFromUrl(url: string): string | null {
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  let rest = url.slice(idx + marker.length);
  rest = rest.replace(/^v\d+\//, ""); // strip version
  rest = rest.replace(/\.[a-zA-Z0-9]+$/, ""); // strip extension
  return rest || null;
}

// Seconds-since-epoch. Wrapped so the Date access stays in one place.
function currentTimeSeconds(): number {
  return Date.now() / 1000;
}
