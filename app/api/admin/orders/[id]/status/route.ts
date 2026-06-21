import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User"; // register schema for populate()
import { requireAdmin, apiError } from "@/lib/api";
import {
  canTransition,
  isValidObjectId,
  restoreOrderStock,
  serializeOrder,
} from "@/lib/orders";
import type { OrderStatus, PaymentStatus } from "@/models/Order";

export const runtime = "nodejs";

type Params = { params: { id: string } };

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

/**
 * PATCH /api/admin/orders/[id]/status
 * Advance the order through pending → processing → shipped → delivered, or
 * cancel it. Side effects:
 *   - Cancelling restores reserved stock (PRD §17.4) and refunds a paid order.
 *   - Delivering a COD order marks it paid (PRD §17.10: pending until admin updates).
 *   - `paymentStatus` may also be set explicitly (e.g. recording a COD payment).
 *
 * Stock is restored via an atomic guard, so the order doc is updated with
 * `$set` (never `save()` on a stale doc) to avoid clobbering `stockDecremented`.
 *
 * Body: { status?: OrderStatus, paymentStatus?: PaymentStatus }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidObjectId(params.id)) return apiError("Invalid order id.", 400);

  let body: { status?: unknown; paymentStatus?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const nextStatus = body.status as OrderStatus | undefined;
  const nextPayment = body.paymentStatus as PaymentStatus | undefined;

  if (nextStatus !== undefined && !ORDER_STATUSES.includes(nextStatus)) {
    return apiError("Invalid order status.", 400);
  }
  if (nextPayment !== undefined && !PAYMENT_STATUSES.includes(nextPayment)) {
    return apiError("Invalid payment status.", 400);
  }
  if (nextStatus === undefined && nextPayment === undefined) {
    return apiError("Nothing to update.", 400);
  }

  await dbConnect();

  const order = await Order.findById(params.id);
  if (!order) return apiError("Order not found.", 404);

  const updates: Record<string, unknown> = {};

  if (nextStatus !== undefined && nextStatus !== order.orderStatus) {
    if (!canTransition(order.orderStatus, nextStatus)) {
      return apiError(
        `Cannot move an order from "${order.orderStatus}" to "${nextStatus}".`,
        400
      );
    }

    if (nextStatus === "cancelled") {
      await restoreOrderStock(String(order._id));
      if (order.paymentStatus === "paid") updates.paymentStatus = "refunded";
    } else if (
      nextStatus === "delivered" &&
      order.paymentMethod === "cod" &&
      order.paymentStatus === "pending"
    ) {
      updates.paymentStatus = "paid";
    }

    updates.orderStatus = nextStatus;
  }

  // An explicit paymentStatus in the body wins over the implicit transitions.
  if (nextPayment !== undefined) updates.paymentStatus = nextPayment;

  await Order.updateOne({ _id: order._id }, { $set: updates });

  const fresh = await Order.findById(order._id)
    .populate("customer", "name email")
    .lean();

  return NextResponse.json({
    order: serializeOrder(fresh, { includeCustomer: true }),
  });
}
