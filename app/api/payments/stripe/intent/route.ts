import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { isValidObjectId } from "@/lib/orders";
import { createStripePaymentIntent, isStripeConfigured } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/payments/stripe/intent
 * Create a Stripe PaymentIntent for one of our pending orders and return the
 * client secret for Stripe.js to confirm in the browser. The amount comes from
 * the stored order total; the order id is carried in PaymentIntent metadata so
 * the webhook can reconcile it.
 *
 * Body: { orderId }
 */
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  if (!isStripeConfigured()) {
    return apiError("Card payments are currently unavailable.", 503);
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
  if (order.paymentMethod !== "stripe") {
    return apiError("This order does not use Stripe.", 400);
  }
  if (order.paymentStatus === "paid") {
    return apiError("This order is already paid.", 409);
  }

  try {
    const intent = await createStripePaymentIntent({
      amount: order.total,
      currency: "inr",
      metadata: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
      },
    });

    order.paymentOrderId = intent.id;
    await order.save();

    return NextResponse.json({
      clientSecret: intent.clientSecret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      orderNumber: order.orderNumber,
    });
  } catch {
    return apiError("Could not start the payment. Please try again.", 502);
  }
}
