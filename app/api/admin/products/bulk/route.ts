import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireAdmin, apiError } from "@/lib/api";
import { deleteImage, publicIdFromUrl } from "@/lib/cloudinary";

export const runtime = "nodejs";

const ACTIONS = ["publish", "unpublish", "delete"] as const;
type BulkAction = (typeof ACTIONS)[number];

/**
 * POST /api/admin/products/bulk
 * Apply one action to many products at once (P2). Body:
 *   { action: "publish" | "unpublish" | "delete", ids: string[] }
 *
 * Delete also best-effort cleans up each product's Cloudinary images (PRD
 * §17.8), mirroring the single-delete route; image failures never block.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: { action?: unknown; ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const action = body.action as BulkAction;
  if (!ACTIONS.includes(action)) {
    return apiError("Unknown bulk action.", 400);
  }

  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((id) => String(id))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];
  if (ids.length === 0) {
    return apiError("Select at least one valid product.", 400);
  }

  await dbConnect();

  if (action === "delete") {
    const products = await Product.find({ _id: { $in: ids } })
      .select("images")
      .lean<{ _id: unknown; images?: string[] }[]>();

    const result = await Product.deleteMany({ _id: { $in: ids } });

    // Clean up images for every deleted product (best-effort).
    await Promise.all(
      products.flatMap((p) =>
        (p.images ?? []).map((url) => {
          const publicId = publicIdFromUrl(url);
          return publicId ? deleteImage(publicId) : Promise.resolve(false);
        })
      )
    );

    return NextResponse.json({ ok: true, action, affected: result.deletedCount });
  }

  const result = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { published: action === "publish" } }
  );

  return NextResponse.json({ ok: true, action, affected: result.modifiedCount });
}
