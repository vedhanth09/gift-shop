import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { parseCartInput } from "@/lib/cart";

export const runtime = "nodejs";

/**
 * GET /api/cart
 * Returns the logged-in customer's server-saved cart, hydrated into the
 * client `CartItem` shape so the Zustand store can merge it on login. Items
 * whose products were deleted are dropped; availability is checked separately
 * via /api/cart/validate.
 */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  await dbConnect();
  const user = await User.findById(session.id).select("cart").lean<{
    cart?: { productId: unknown; qty: number }[];
  } | null>();

  const saved = user?.cart ?? [];
  if (saved.length === 0) return NextResponse.json({ items: [] });

  const ids = saved.map((c) => c.productId);
  const products = await Product.find({ _id: { $in: ids } })
    .select("title slug images price")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = saved
    .map((c) => {
      const p = byId.get(String(c.productId));
      if (!p) return null;
      return {
        productId: String(p._id),
        slug: p.slug,
        title: p.title,
        price: p.price,
        image: p.images?.[0],
        qty: c.qty,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}

/**
 * PUT /api/cart
 * Replaces the customer's server cart with the supplied items. Only
 * `productId` + `qty` are stored; titles/prices are always re-resolved so the
 * server copy never holds stale snapshots.
 *
 * Body: { items: [{ productId, qty }] }
 */
export async function PUT(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const cart = parseCartInput(body.items).map((l) => ({
    productId: l.productId,
    qty: l.qty,
  }));

  await dbConnect();
  await User.findByIdAndUpdate(session.id, { $set: { cart } });

  return NextResponse.json({ ok: true });
}
