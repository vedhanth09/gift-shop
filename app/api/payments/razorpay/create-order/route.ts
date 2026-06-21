import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { isValidObjectId } from "@/lib/orders";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/payments/razorpay/create-order
 * Create a Razorpay order for one of our pending orders and hand the browser
 * the details it needs to open Razorpay Checkout. The amount comes from the
 * stored order total — never from the client.
 *
 * Body: { orderId }
 */
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  if (!isRazorpayConfigured()) {
    return apiError("Online payments are currently unavailable.", 503);
  }

  let body: { orderId?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const orderId = String(body.orderId ?? "");
  if (!isValidObjectId(orderId)) return apiError("Invalid order id.", 400);

  await dbConnect();
  const order = await Order.findOne({ _id: orderId, customer: session.id });
  if (!order) return apiError("Order not found.", 404);
  if (order.paymentMethod !== "razorpay") {
    return apiError("This order does not use Razorpay.", 400);
  }
  if (order.paymentStatus === "paid") {
    return apiError("This order is already paid.", 409);
  }

  try {
    const rzpOrder = await createRazorpayOrder({
      amount: order.total,
      currency: "INR",
      receipt: order.orderNumber,
    });

    order.paymentOrderId = rzpOrder.id;
    await order.save();

    return NextResponse.json({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderNumber: order.orderNumber,
    });
  } catch {
    return apiError("Could not start the payment. Please try again.", 502);
  }
}
