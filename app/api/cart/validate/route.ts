import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { parseCartInput, validateCart } from "@/lib/cart";

export const runtime = "nodejs";

/**
 * POST /api/cart/validate
 * Public. Re-checks a cart against live product data (publish state, stock,
 * current price) so the cart and checkout pages can flag "no longer available"
 * items, refresh prices and decide whether checkout is allowed. The cart lives
 * client-side, so this is the single source of truth for availability.
 *
 * Body: { items: [{ productId, qty }] }
 */
export async function POST(req: NextRequest) {
  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const input = parseCartInput(body.items);
  const result = await validateCart(input);
  return NextResponse.json(result);
}
