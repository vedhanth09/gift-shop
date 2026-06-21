import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { serializeOrder } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * GET /api/account/orders
 * The logged-in customer's own orders, newest first. Customers only ever see
 * their own orders — the query is scoped to `session.id`.
 */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  await dbConnect();
  const docs = await Order.find({ customer: session.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ orders: docs.map((d) => serializeOrder(d)) });
}
