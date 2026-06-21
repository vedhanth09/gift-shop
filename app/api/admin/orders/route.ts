import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User"; // register schema for populate()
import { requireAdmin } from "@/lib/api";
import {
  ORDER_STATUSES,
  ORDERS_PAGE_SIZE,
  serializeOrder,
} from "@/lib/orders";
import type { OrderStatus } from "@/models/Order";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders
 * Every order, newest first, with an optional `?status=` filter and `?page=`
 * pagination. Customer name/email are populated for the list view.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status");
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));

  const filter: Record<string, unknown> = {};
  if (statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)) {
    filter.orderStatus = statusParam;
  }

  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ORDERS_PAGE_SIZE)
      .limit(ORDERS_PAGE_SIZE)
      .populate("customer", "name email")
      .lean(),
    Order.countDocuments(filter),
  ]);

  return NextResponse.json({
    orders: docs.map((d) => serializeOrder(d, { includeCustomer: true })),
    total,
    page,
    pages: Math.ceil(total / ORDERS_PAGE_SIZE),
  });
}
