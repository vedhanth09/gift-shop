import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { confirmOrder, isValidObjectId, markOrderPaid } from "@/lib/orders";
import { verifyStripeWebhook } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 * Verify the Stripe signature over the raw body, then on
 * `payment_intent.succeeded` mark the matching order paid and decrement stock
 * (PRD §17.3). Idempotent — Stripe retries deliveries.
 *
 * Gated entirely by the signature check (the caller is Stripe, not a session).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");

  const result = verifyStripeWebhook(raw, signature);
  if (!result.ok || !result.event) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const { event } = result;

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as {
      id?: string;
      metadata?: { orderId?: string };
    };
    const orderId = intent.metadata?.orderId;

    await dbConnect();
    const order =
      orderId && isValidObjectId(orderId)
        ? await Order.findById(orderId).select("_id")
        : intent.id
          ? await Order.findOne({ paymentOrderId: intent.id }).select("_id")
          : null;

    if (order) {
      await markOrderPaid(String(order._id), intent.id);
      await confirmOrder(String(order._id));
    }
  }

  return NextResponse.json({ received: true });
}
