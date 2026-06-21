import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import { requireAdmin, apiError } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/slug";
import { deleteImage, publicIdFromUrl } from "@/lib/cloudinary";
import { parseProductBody } from "@/lib/product-validation";

export const runtime = "nodejs";

type Params = { params: { id: string } };

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** GET /api/admin/products/[id] — single product (any publish state). */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidId(params.id)) return apiError("Invalid product id.", 400);

  await dbConnect();
  const product = await Product.findById(params.id)
    .populate("category", "name slug")
    .lean();
  if (!product) return apiError("Product not found.", 404);

  return NextResponse.json({ product });
}

/** PUT /api/admin/products/[id] — update fields; re-slug when title changes. */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidId(params.id)) return apiError("Invalid product id.", 400);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  await dbConnect();

  const existing = await Product.findById(params.id);
  if (!existing) return apiError("Product not found.", 404);

  const parsed = await parseProductBody(body, true);
  if ("error" in parsed) return apiError(parsed.error, 400);

  const update = parsed.data;

  // Regenerate the slug only when the title actually changes.
  if (typeof update.title === "string" && update.title !== existing.title) {
    update.slug = await generateUniqueSlug(
      Product,
      update.title,
      params.id
    );
  }

  const product = await Product.findByIdAndUpdate(params.id, update, {
    new: true,
    runValidators: true,
  })
    .populate("category", "name slug")
    .lean();

  return NextResponse.json({ product });
}

/**
 * DELETE /api/admin/products/[id]
 * Removes the product and best-effort cleans up its Cloudinary images
 * (PRD §17.8). Image cleanup failures never block the delete.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidId(params.id)) return apiError("Invalid product id.", 400);

  await dbConnect();

  const product = await Product.findByIdAndDelete(params.id);
  if (!product) return apiError("Product not found.", 404);

  await Promise.all(
    (product.images ?? []).map((url) => {
      const publicId = publicIdFromUrl(url);
      return publicId ? deleteImage(publicId) : Promise.resolve(false);
    })
  );

  return NextResponse.json({ ok: true });
}
