import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { confirmOrder, isValidObjectId, markOrderPaid } from "@/lib/orders";
import { verifyRazorpayPaymentSignature } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/payments/razorpay/verify
 * Verify the signature Razorpay Checkout returns to the browser, then mark the
 * order paid and reserve stock. The webhook (`/api/webhooks/razorpay`) is the
 * authoritative backstop; both paths are idempotent, so a double-fire is safe.
 *
 * Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  let body: {
    orderId?: unknown;
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const orderId = String(body.orderId ?? "");
  const rzpOrderId = String(body.razorpay_order_id ?? "");
  const rzpPaymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");

  if (!isValidObjectId(orderId) || !rzpOrderId || !rzpPaymentId || !signature) {
    return apiError("Missing payment details.", 400);
  }

  await dbConnect();
  const order = await Order.findOne({ _id: orderId, customer: session.id });
  if (!order) return apiError("Order not found.", 404);

  // The signed order id must match the one we created for this order.
  if (order.paymentOrderId && order.paymentOrderId !== rzpOrderId) {
    return apiError("Payment does not match this order.", 400);
  }

  if (!verifyRazorpayPaymentSignature(rzpOrderId, rzpPaymentId, signature)) {
    return apiError("Payment verification failed.", 400);
  }

  await markOrderPaid(orderId, rzpPaymentId);
  await confirmOrder(orderId);

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}
