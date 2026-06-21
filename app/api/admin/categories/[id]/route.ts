import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { requireAdmin, apiError } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

type Params = { params: { id: string } };

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** PUT /api/admin/categories/[id] — rename a category (re-slugs). */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidId(params.id)) return apiError("Invalid category id.", 400);

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return apiError("Category name is required.", 400);

  await dbConnect();

  const existing = await Category.findById(params.id);
  if (!existing) return apiError("Category not found.", 404);

  existing.name = name;
  // Keep the slug in sync with the name (unique, excluding self).
  existing.slug = await generateUniqueSlug(Category, name, params.id);
  await existing.save();

  return NextResponse.json({ category: existing.toObject() });
}

/**
 * DELETE /api/admin/categories/[id]
 * Blocked while any product still references the category, so storefront
 * listings never point at a missing category.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidId(params.id)) return apiError("Invalid category id.", 400);

  await dbConnect();

  const inUse = await Product.exists({ category: params.id });
  if (inUse) {
    return apiError(
      "This category has products assigned to it. Reassign or delete them first.",
      409
    );
  }

  const deleted = await Category.findByIdAndDelete(params.id);
  if (!deleted) return apiError("Category not found.", 404);

  return NextResponse.json({ ok: true });
}
