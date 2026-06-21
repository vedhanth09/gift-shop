import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireAdmin, apiError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/**
 * PATCH /api/admin/products/[id]/publish
 * Toggle published state, or set it explicitly with a `{ published: boolean }`
 * body. Only published products appear on the storefront (PRD §17.2).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    return apiError("Invalid product id.", 400);
  }

  // Body is optional: with no/invalid JSON we just flip the current state.
  let desired: boolean | undefined;
  try {
    const body = (await req.json()) as { published?: unknown };
    if (typeof body.published === "boolean") desired = body.published;
  } catch {
    desired = undefined;
  }

  await dbConnect();

  const product = await Product.findById(params.id);
  if (!product) return apiError("Product not found.", 404);

  product.published = desired ?? !product.published;
  await product.save();

  return NextResponse.json({
    ok: true,
    id: String(product._id),
    published: product.published,
  });
}
