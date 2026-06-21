import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { parseCartInput, validateCart } from "@/lib/cart";
import {
  PAYMENT_METHODS,
  confirmOrder,
  generateOrderNumber,
  parseShippingAddress,
  serializeOrder,
} from "@/lib/orders";
import { validateCoupon, normalizeCode } from "@/lib/coupons";
import { getSettings, shippingFeeFor } from "@/lib/settings";
import { isEmailConfigured } from "@/lib/email";
import User from "@/models/User";
import type { PaymentMethod } from "@/models/Order";

export const runtime = "nodejs";

/**
 * POST /api/orders
 * Create an order for the logged-in customer (no guest checkout, PRD §13).
 *
 * The cart lives client-side, so it is re-validated against the database here:
 * prices, titles and stock are snapshotted from the live products (PRD §17.9),
 * and unavailable lines block the order (PRD §17.5). The order is created
 * `paymentStatus: pending`:
 *   - COD orders are confirmed immediately (stock reserved, cart cleared,
 *     receipt sent) and stay pending until the admin marks them paid (§17.10).
 *   - Online orders stay pending and reserve stock only once payment is
 *     confirmed via the gateway verify/webhook routes (§17.3).
 *
 * Body: { items: [{ productId, qty }], shippingAddress, paymentMethod }
 */
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Please sign in to place an order.", 401);

  let body: {
    items?: unknown;
    shippingAddress?: unknown;
    paymentMethod?: unknown;
    couponCode?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const paymentMethod = body.paymentMethod as PaymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return apiError("Choose a valid payment method.", 400);
  }

  const shippingAddress = parseShippingAddress(body.shippingAddress);
  if (!shippingAddress) {
    return apiError("Please complete every delivery address field.", 400);
  }

  const items = parseCartInput(body.items);
  if (items.length === 0) {
    return apiError("Your cart is empty.", 400);
  }

  await dbConnect();

  // Email verification is required to order (V1.1). Only enforced when email is
  // configured — otherwise verification is impossible, so accounts are auto-
  // verified at sign-up and this check passes. Legacy accounts whose flag is
  // unset (not explicitly `false`) are not blocked.
  if (isEmailConfigured()) {
    const account = await User.findById(session.id).select("emailVerified").lean<{
      emailVerified?: boolean;
    } | null>();
    if (account && account.emailVerified === false) {
      return apiError(
        "Please verify your email before placing an order. Check your inbox for the verification link.",
        403
      );
    }
  }

  // Re-check publish state, stock and price against the live catalogue.
  const validation = await validateCart(items);
  if (validation.checkoutBlocked) {
    return NextResponse.json(
      {
        error:
          "Some items are no longer available. Please review your cart and try again.",
        validation,
      },
      { status: 409 }
    );
  }

  // Snapshot title/price; clamp qty to available stock (PRD §17.9).
  const orderItems = validation.lines.map((line) => ({
    productId: line.productId,
    title: line.title,
    qty: Math.min(line.qty, line.stock),
    price: line.price,
  }));

  const subtotal = validation.subtotal;

  // Re-validate the coupon against the server-computed subtotal (PRD §17.6) —
  // the client preview is never trusted for the final discount.
  let discountAmount = 0;
  let couponApplied: string | undefined;
  const couponCode = normalizeCode(body.couponCode);
  if (couponCode) {
    const coupon = await validateCoupon(couponCode, subtotal);
    if (!coupon.ok) {
      return apiError(coupon.error ?? "This coupon code is not valid.", 400);
    }
    discountAmount = coupon.discountAmount ?? 0;
    couponApplied = String(coupon.coupon!._id);
  }

  // Shipping is a flat fee from store settings, waived past any free-shipping
  // threshold, computed against the discounted subtotal.
  const settings = await getSettings();
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingFee = shippingFeeFor(settings, discountedSubtotal);
  const total = discountedSubtotal + shippingFee;

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: session.id,
    items: orderItems,
    total,
    discountAmount,
    shippingFee,
    couponApplied,
    shippingAddress,
    paymentMethod,
    paymentStatus: "pending",
    orderStatus: "pending",
  });

  // COD is confirmed on placement; online methods wait for payment success.
  if (paymentMethod === "cod") {
    await confirmOrder(String(order._id));
  }

  return NextResponse.json(
    {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      paymentMethod,
      amount: total,
      order: serializeOrder(order.toObject()),
    },
    { status: 201 }
  );
}
