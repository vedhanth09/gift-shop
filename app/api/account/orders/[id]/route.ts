import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { isValidObjectId, serializeOrder } from "@/lib/orders";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/**
 * GET /api/account/orders/[id]
 * A single order belonging to the logged-in customer. Scoping the query to
 * `customer: session.id` means another customer's id returns 404, not 403.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);
  if (!isValidObjectId(params.id)) return apiError("Invalid order id.", 400);

  await dbConnect();
  const doc = await Order.findOne({
    _id: params.id,
    customer: session.id,
  }).lean();

  if (!doc) return apiError("Order not found.", 404);

  return NextResponse.json({ order: serializeOrder(doc) });
}
