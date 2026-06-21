import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order, {
  type IOrder,
  type IShippingAddress,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import { nextSequence } from "@/models/Counter";
import { consumeCoupon } from "@/lib/coupons";
import { sendOrderConfirmationEmail } from "@/lib/email";

/**
 * Server-side order helpers shared by the customer ordering, payment and admin
 * routes. Centralises the rules that must hold everywhere: order-number format,
 * price/title snapshots, idempotent stock reservation and the order-status
 * lifecycle (PRD §17.3, §17.4, §17.7, §17.9).
 *
 * Money is integer paise throughout (PRD §7).
 */

export const ORDERS_PAGE_SIZE = 20;

export const PAYMENT_METHODS: PaymentMethod[] = ["razorpay", "stripe", "cod"];
export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Allowed forward transitions for `orderStatus`; any order may be cancelled. */
const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW[from]?.includes(to) ?? false;
}

const ADDRESS_FIELDS: (keyof IShippingAddress)[] = [
  "name",
  "phone",
  "line1",
  "city",
  "state",
  "pincode",
];

/** Validate + trim a shipping address, or return null when a field is missing. */
export function parseShippingAddress(raw: unknown): IShippingAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const out = {} as IShippingAddress;
  for (const field of ADDRESS_FIELDS) {
    const value = typeof src[field] === "string" ? (src[field] as string).trim() : "";
    if (!value) return null;
    out[field] = value;
  }
  return out;
}

/** `GFT-YYYY-XXXXX`, zero-padded sequential within the current year. */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`order-${year}`);
  return `GFT-${year}-${String(seq).padStart(5, "0")}`;
}

// --- Stock reservation ------------------------------------------------------

/**
 * Reserve stock + finalise the order exactly once: decrement product stock,
 * empty the customer's server cart and send the confirmation email. Guarded by
 * the `stockDecremented` flag flipped atomically, so repeated webhook
 * deliveries (or verify + webhook racing) never double-apply (PRD §17.3).
 */
export async function confirmOrder(orderId: string): Promise<void> {
  await dbConnect();

  // Flip false → true atomically; only the first caller gets the document.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDecremented: { $ne: true } },
    { $set: { stockDecremented: true } },
    { new: true }
  );
  if (!order) return; // already confirmed by an earlier call

  // Clamp at zero so a late race can never push stock negative.
  await Promise.all(
    order.items.map((item) =>
      Product.updateOne({ _id: item.productId }, [
        {
          $set: {
            stock: { $max: [0, { $subtract: ["$stock", item.qty] }] },
          },
        },
      ])
    )
  );

  // Consume the coupon exactly once — guarded by the same `stockDecremented`
  // flip above, so abandoned online checkouts never burn a use (PRD §17.6).
  if (order.couponApplied) {
    await consumeCoupon(String(order.couponApplied));
  }

  // The cart has been turned into an order — clear the server copy so it isn't
  // merged back on the next login.
  const user = await User.findByIdAndUpdate(order.customer, {
    $set: { cart: [] },
  })
    .select("name email")
    .lean<{ name?: string; email?: string } | null>();

  if (user?.email) {
    try {
      await sendOrderConfirmationEmail({
        to: user.email,
        name: user.name ?? "",
        order,
      });
    } catch {
      /* email is best-effort and never blocks order confirmation */
    }
  }
}

/**
 * Restore reserved stock when a confirmed order is cancelled (PRD §17.4).
 * Guarded by the same flag so stock is only ever given back once.
 */
export async function restoreOrderStock(orderId: string): Promise<void> {
  await dbConnect();

  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDecremented: true },
    { $set: { stockDecremented: false } },
    { new: true }
  );
  if (!order) return; // nothing was reserved

  await Promise.all(
    order.items.map((item) =>
      Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
    )
  );
}

/**
 * Mark an order paid exactly once and record the gateway payment id. Returns
 * true when this call performed the transition (so the caller knows whether to
 * run post-payment side effects), false if it was already paid.
 */
export async function markOrderPaid(
  orderId: string,
  paymentRef?: string
): Promise<boolean> {
  await dbConnect();
  const res = await Order.updateOne(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", ...(paymentRef ? { paymentRef } : {}) } }
  );
  return res.modifiedCount > 0;
}

// --- Serialisation ----------------------------------------------------------

export interface OrderItemDTO {
  productId: string;
  title: string;
  qty: number;
  price: number; // paise, snapshot
}

export interface OrderCustomerDTO {
  id: string;
  name: string;
  email: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  items: OrderItemDTO[];
  subtotal: number; // paise, sum of item snapshots
  discountAmount: number;
  shippingFee: number;
  total: number;
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentRef: string | null;
  createdAt: string;
  customer?: OrderCustomerDTO; // admin views only
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Map a (possibly populated) lean Order document to the API shape. */
export function serializeOrder(
  doc: any,
  opts: { includeCustomer?: boolean } = {}
): OrderDTO {
  const items: OrderItemDTO[] = (doc.items ?? []).map((it: any) => ({
    productId: String(it.productId),
    title: it.title,
    qty: it.qty,
    price: it.price,
  }));

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const dto: OrderDTO = {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    items,
    subtotal,
    discountAmount: doc.discountAmount ?? 0,
    shippingFee: doc.shippingFee ?? 0,
    total: doc.total,
    shippingAddress: doc.shippingAddress,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    orderStatus: doc.orderStatus,
    paymentRef: doc.paymentRef ?? null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };

  if (opts.includeCustomer) {
    const c = doc.customer;
    if (c && typeof c === "object" && "email" in c) {
      dto.customer = {
        id: String(c._id),
        name: c.name ?? "",
        email: c.email ?? "",
      };
    }
  }

  return dto;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Narrow a string to a valid ObjectId (route param guard). */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export type { IOrder };
