import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User"; // register schema for populate()
import { requireAdmin, apiError } from "@/lib/api";
import { isValidObjectId, serializeOrder } from "@/lib/orders";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/** GET /api/admin/orders/[id] — full order detail with customer info. */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidObjectId(params.id)) return apiError("Invalid order id.", 400);

  await dbConnect();
  const doc = await Order.findById(params.id)
    .populate("customer", "name email")
    .lean();

  if (!doc) return apiError("Order not found.", 404);

  return NextResponse.json({
    order: serializeOrder(doc, { includeCustomer: true }),
  });
}
