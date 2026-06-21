import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Coupon from "@/models/Coupon";
import { requireAdmin, apiError } from "@/lib/api";
import { isValidObjectId } from "@/lib/orders";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/** DELETE /api/admin/coupons/[id] — remove a coupon. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isValidObjectId(params.id)) return apiError("Invalid coupon id.", 400);

  await dbConnect();
  const deleted = await Coupon.findByIdAndDelete(params.id);
  if (!deleted) return apiError("Coupon not found.", 404);

  return NextResponse.json({ ok: true });
}
