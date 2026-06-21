import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";
import type { OrderStatus, PaymentMethod } from "@/models/Order";

/**
 * Admin analytics helpers shared by the `/api/admin/analytics/*` routes and the
 * `/admin/analytics` page, so the numbers are computed one way (PRD §Phase 5).
 *
 * Revenue is counted from paid orders only (matching the dashboard's "total
 * revenue"); unit sales count every non-cancelled order. Money is paise.
 * Days are bucketed in IST so "today" lines up with the en-IN UI.
 */

const TZ = "Asia/Kolkata";

export const REVENUE_PERIODS = [7, 30, 90] as const;
export type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

export function normalizePeriod(value: unknown): RevenuePeriod {
  const n = Math.floor(Number(value));
  return (REVENUE_PERIODS as readonly number[]).includes(n)
    ? (n as RevenuePeriod)
    : 30;
}

export interface RevenuePoint {
  date: string; // YYYY-MM-DD (IST)
  revenue: number; // paise
}

export interface RevenueReport {
  period: RevenuePeriod;
  points: RevenuePoint[];
  total: number; // paise
  orderCount: number;
}

/** Start of the day `days-1` ago, in UTC, so the range covers `days` IST days. */
function rangeStart(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

/** Daily paid-revenue series for the last `period` days, gaps filled with 0. */
export async function getRevenueReport(
  period: RevenuePeriod
): Promise<RevenueReport> {
  await dbConnect();
  const start = rangeStart(period);

  const rows = await Order.aggregate<{ _id: string; revenue: number; count: number }>([
    { $match: { paymentStatus: "paid", createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ },
        },
        revenue: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDate = new Map(rows.map((r) => [r._id, r]));

  const points: RevenuePoint[] = [];
  let total = 0;
  let orderCount = 0;
  for (let i = 0; i < period; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = isoDayInTZ(d);
    const row = byDate.get(key);
    points.push({ date: key, revenue: row?.revenue ?? 0 });
    total += row?.revenue ?? 0;
    orderCount += row?.count ?? 0;
  }

  return { period, points, total, orderCount };
}

/** `YYYY-MM-DD` for a date as seen in IST (matches the aggregation buckets). */
function isoDayInTZ(date: Date): string {
  // en-CA gives ISO-ordered YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export interface TopProduct {
  productId: string;
  title: string; // order-line snapshot
  units: number;
  revenue: number; // paise
}

/** Best-selling products by units across all non-cancelled orders. */
export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  await dbConnect();

  const rows = await Order.aggregate<{
    _id: unknown;
    title: string;
    units: number;
    revenue: number;
  }>([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        title: { $last: "$items.title" },
        units: { $sum: "$items.qty" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);

  return rows.map((r) => ({
    productId: String(r._id),
    title: r.title,
    units: r.units,
    revenue: r.revenue,
  }));
}

// --- Advanced analytics (V1.1) ---------------------------------------------

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_METHODS: PaymentMethod[] = ["razorpay", "stripe", "cod"];

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

/** Order counts per fulfilment status (all-time), every status represented. */
export async function getOrderStatusBreakdown(): Promise<StatusCount[]> {
  await dbConnect();
  const rows = await Order.aggregate<{ _id: OrderStatus; count: number }>([
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
  ]);
  const byStatus = new Map(rows.map((r) => [r._id, r.count]));
  return ORDER_STATUSES.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));
}

export interface PaymentBreakdownRow {
  method: PaymentMethod;
  orders: number; // all orders placed with this method
  paidRevenue: number; // paise, paid orders only
}

/** Order counts and paid revenue per payment method (all-time). */
export async function getPaymentBreakdown(): Promise<PaymentBreakdownRow[]> {
  await dbConnect();
  const rows = await Order.aggregate<{
    _id: PaymentMethod;
    orders: number;
    paidRevenue: number;
  }>([
    {
      $group: {
        _id: "$paymentMethod",
        orders: { $sum: 1 },
        paidRevenue: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0],
          },
        },
      },
    },
  ]);
  const byMethod = new Map(rows.map((r) => [r._id, r]));
  return PAYMENT_METHODS.map((method) => ({
    method,
    orders: byMethod.get(method)?.orders ?? 0,
    paidRevenue: byMethod.get(method)?.paidRevenue ?? 0,
  }));
}

export interface CustomerStats {
  total: number; // all customers
  newInPeriod: number; // registered within the period
  repeat: number; // customers with ≥2 non-cancelled orders
}

/** High-level customer counts (total, new this period, repeat buyers). */
export async function getCustomerStats(
  period: RevenuePeriod
): Promise<CustomerStats> {
  await dbConnect();
  const start = rangeStart(period);

  const [total, newInPeriod, repeatRows] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: start } }),
    Order.aggregate<{ _id: number }>([
      { $match: { orderStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$customer", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: "_id" },
    ]),
  ]);

  return {
    total,
    newInPeriod,
    repeat: repeatRows[0]?._id ?? 0,
  };
}

export interface CategorySales {
  categoryId: string;
  name: string;
  units: number;
  revenue: number; // paise
}

/** Revenue and units sold per category across non-cancelled orders. */
export async function getSalesByCategory(limit = 8): Promise<CategorySales[]> {
  await dbConnect();
  const rows = await Order.aggregate<{
    _id: unknown;
    name: string;
    units: number;
    revenue: number;
  }>([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        units: { $sum: "$items.qty" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        units: { $sum: "$units" },
        revenue: { $sum: "$revenue" },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $set: {
        name: {
          $ifNull: [{ $first: "$category.name" }, "Uncategorised"],
        },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  return rows.map((r) => ({
    categoryId: String(r._id),
    name: r.name,
    units: r.units,
    revenue: r.revenue,
  }));
}

export interface AdvancedAnalytics {
  statusBreakdown: StatusCount[];
  paymentBreakdown: PaymentBreakdownRow[];
  customers: CustomerStats;
  categories: CategorySales[];
}

/** All advanced sections in one round of parallel queries. */
export async function getAdvancedAnalytics(
  period: RevenuePeriod
): Promise<AdvancedAnalytics> {
  const [statusBreakdown, paymentBreakdown, customers, categories] =
    await Promise.all([
      getOrderStatusBreakdown(),
      getPaymentBreakdown(),
      getCustomerStats(period),
      getSalesByCategory(),
    ]);
  return { statusBreakdown, paymentBreakdown, customers, categories };
}
