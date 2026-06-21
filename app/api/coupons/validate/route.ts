import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { parseCartInput, validateCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

/**
 * POST /api/coupons/validate
 * Preview a coupon for the current cart (PRD §17.6). The subtotal is computed
 * server-side from the live cart, never trusted from the client, so the
 * preview matches what order creation will apply.
 *
 * Body: { code, items: [{ productId, qty }] }
 */
export async function POST(req: NextRequest) {
  let body: { code?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const items = parseCartInput(body.items);
  const { subtotal } = await validateCart(items);

  const result = await validateCoupon(body.code, subtotal);
  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    code: result.code,
    discountAmount: result.discountAmount,
    subtotal,
    total: Math.max(0, subtotal - (result.discountAmount ?? 0)),
  });
}
