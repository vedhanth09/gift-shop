import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { confirmOrder, markOrderPaid } from "@/lib/orders";
import { verifyRazorpayWebhook } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/razorpay
 * Authoritative payment confirmation: verify the HMAC signature over the raw
 * body, then on a successful payment mark the matching order paid and decrement
 * stock (PRD §17.3). Idempotent — Razorpay retries deliveries.
 *
 * This route sits outside the `/api/admin` middleware matcher and is gated
 * entirely by the signature check (no session — the caller is Razorpay).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // payment.captured / order.paid both signal a completed payment.
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;

    if (rzpOrderId) {
      await dbConnect();
      const order = await Order.findOne({ paymentOrderId: rzpOrderId }).select(
        "_id"
      );
      if (order) {
        await markOrderPaid(String(order._id), payment?.id);
        await confirmOrder(String(order._id));
      }
    }
  }

  // Always 200 on a verified event so Razorpay stops retrying.
  return NextResponse.json({ received: true });
}
