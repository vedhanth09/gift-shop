import { Schema, model, models, type Model, type Document, type Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  title: string; // snapshot at time of order
  qty: number;
  price: number; // snapshot at time of order
}

export interface IShippingAddress {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export type PaymentMethod = "razorpay" | "stripe" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface IOrder extends Document {
  orderNumber: string; // GFT-YYYY-XXXXX
  customer: Types.ObjectId;
  items: IOrderItem[];
  total: number;
  couponApplied?: Types.ObjectId;
  discountAmount: number;
  shippingFee: number;
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  /** Gateway order/intent id created before payment (Razorpay order, Stripe PI). */
  paymentOrderId?: string;
  /** Gateway payment id captured on success. */
  paymentRef?: string;
  /**
   * Whether stock has been reserved for this order. Flipped exactly once when
   * the order is confirmed (COD placement or payment success) so repeated
   * webhooks never double-decrement, and unflipped when stock is restored on
   * cancellation (PRD §17.3 / §17.4).
   */
  stockDecremented: boolean;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: { type: [OrderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  couponApplied: { type: Schema.Types.ObjectId, ref: "Coupon" },
  discountAmount: { type: Number, default: 0, min: 0 },
  shippingFee: { type: Number, default: 0, min: 0 },
  shippingAddress: { type: ShippingAddressSchema, required: true },
  paymentMethod: { type: String, enum: ["razorpay", "stripe", "cod"], required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
    index: true,
  },
  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
    index: true,
  },
  paymentOrderId: { type: String, index: true },
  paymentRef: { type: String },
  stockDecremented: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Compound indexes for the hot read paths (V1.1 perf audit): a customer's own
// orders newest-first, the admin list filtered by status, and the revenue
// aggregation that matches paid orders within a date range.
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: 1 });

const Order: Model<IOrder> = models.Order || model<IOrder>("Order", OrderSchema);

export default Order;
