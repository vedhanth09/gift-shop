import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { serializeProduct, type PublicProduct } from "@/lib/products";

export const runtime = "nodejs";

/** Pull a valid ObjectId string out of the request body. */
async function readProductId(req: NextRequest): Promise<string | null> {
  let body: { productId?: unknown };
  try {
    body = await req.json();
  } catch {
    return null;
  }
  const id = String(body.productId ?? "");
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

/**
 * GET /api/account/wishlist
 * The customer's saved products. Returns the full public product shape (for the
 * wishlist page) plus a bare id list (so client stores can hydrate heart state
 * cheaply). Only published products are returned; unpublished/deleted ids are
 * dropped from the response but left on the user until they next save.
 */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  await dbConnect();
  const user = await User.findById(session.id)
    .select("wishlist")
    .lean<{ wishlist?: unknown[] } | null>();

  const ids = (user?.wishlist ?? []).map(String);
  if (ids.length === 0) return NextResponse.json({ items: [], ids: [] });

  const docs = await Product.find({ _id: { $in: ids }, published: true })
    .populate("category", "name slug")
    .lean();

  // Preserve the user's saved order (most-recently-added first is set on write).
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const items: PublicProduct[] = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((d) => serializeProduct(d));

  return NextResponse.json({ items, ids: items.map((p) => p.id) });
}

/**
 * POST /api/account/wishlist  Body: { productId }
 * Add a product to the wishlist (idempotent — most recent first).
 */
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  const productId = await readProductId(req);
  if (!productId) return apiError("A valid product id is required.", 400);

  await dbConnect();

  const exists = await Product.exists({ _id: productId });
  if (!exists) return apiError("Product not found.", 404);

  // $pull then $push (in one save would need two ops) keeps the newest first
  // without duplicates. addToSet alone can't reorder, so do it in two updates.
  await User.findByIdAndUpdate(session.id, { $pull: { wishlist: productId } });
  await User.findByIdAndUpdate(session.id, {
    $push: { wishlist: { $each: [productId], $position: 0 } },
  });

  return NextResponse.json({ ok: true, productId });
}

/**
 * DELETE /api/account/wishlist  Body: { productId }
 * Remove a product from the wishlist.
 */
export async function DELETE(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  const productId = await readProductId(req);
  if (!productId) return apiError("A valid product id is required.", 400);

  await dbConnect();
  await User.findByIdAndUpdate(session.id, { $pull: { wishlist: productId } });

  return NextResponse.json({ ok: true, productId });
}
