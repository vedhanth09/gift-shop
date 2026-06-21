import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Coupon from "@/models/Coupon";
import { requireAdmin, apiError } from "@/lib/api";
import { serializeCoupon, normalizeCode, MAX_PERCENT } from "@/lib/coupons";
import { rupeesToPaise } from "@/lib/utils";

export const runtime = "nodejs";

/** GET /api/admin/coupons — list all coupons, newest first. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const docs = await Coupon.find().sort({ _id: -1 }).lean();
  return NextResponse.json({ coupons: docs.map(serializeCoupon) });
}

/**
 * POST /api/admin/coupons — create a coupon.
 * Money fields arrive in rupees (admin UX, PRD §7) and are stored as paise.
 * `value` is a percent for percentage coupons, rupees→paise for flat coupons.
 *
 * Body: { code, type, value, minOrderValue?, expiresAt?, usageLimit?, active? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: {
    code?: unknown;
    type?: unknown;
    value?: unknown;
    minOrderValue?: unknown;
    expiresAt?: unknown;
    usageLimit?: unknown;
    active?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const code = normalizeCode(body.code);
  if (!code) return apiError("Coupon code is required.", 400);

  const type = body.type;
  if (type !== "percentage" && type !== "flat") {
    return apiError("Coupon type must be 'percentage' or 'flat'.", 400);
  }

  const rawValue = Number(body.value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return apiError("Coupon value must be greater than zero.", 400);
  }
  if (type === "percentage" && rawValue > MAX_PERCENT) {
    return apiError("A percentage coupon can't exceed 100%.", 400);
  }
  const value = type === "flat" ? rupeesToPaise(rawValue) : Math.round(rawValue);

  let minOrderValue: number | undefined;
  if (body.minOrderValue !== undefined && body.minOrderValue !== null && body.minOrderValue !== "") {
    const n = Number(body.minOrderValue);
    if (!Number.isFinite(n) || n < 0) {
      return apiError("Minimum order value must be a positive amount.", 400);
    }
    minOrderValue = rupeesToPaise(n);
  }

  let expiresAt: Date | undefined;
  if (body.expiresAt) {
    const d = new Date(String(body.expiresAt));
    if (Number.isNaN(d.getTime())) return apiError("Invalid expiry date.", 400);
    expiresAt = d;
  }

  let usageLimit: number | null = null;
  if (body.usageLimit !== undefined && body.usageLimit !== null && body.usageLimit !== "") {
    const n = Math.floor(Number(body.usageLimit));
    if (!Number.isFinite(n) || n < 1) {
      return apiError("Usage limit must be a whole number of at least 1.", 400);
    }
    usageLimit = n;
  }

  await dbConnect();

  const exists = await Coupon.exists({ code });
  if (exists) return apiError("A coupon with this code already exists.", 409);

  const coupon = await Coupon.create({
    code,
    type,
    value,
    minOrderValue,
    expiresAt,
    usageLimit,
    active: body.active === undefined ? true : Boolean(body.active),
  });

  return NextResponse.json(
    { coupon: serializeCoupon(coupon.toObject()) },
    { status: 201 }
  );
}
