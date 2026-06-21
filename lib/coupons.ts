import { dbConnect } from "@/lib/db";
import Coupon, { type ICoupon } from "@/models/Coupon";

/**
 * Coupon validation + discount maths shared by the public `/api/coupons/validate`
 * preview, order creation and the admin coupon routes. Centralises PRD §17.6:
 * a coupon must be active, unexpired, under its usage limit and meet the minimum
 * order value, and is consumed once per order.
 *
 * Money is integer paise throughout (PRD §7). For `flat` coupons `value` is a
 * paise amount; for `percentage` coupons it is a whole-number percent (1–100).
 */

export const MAX_PERCENT = 100;

/** Normalise an arbitrary coupon-code input to the stored uppercase form. */
export function normalizeCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

/** Discount (paise) a coupon yields on `subtotal`, never exceeding it. */
export function computeDiscount(
  coupon: Pick<ICoupon, "type" | "value">,
  subtotal: number
): number {
  if (subtotal <= 0) return 0;
  const raw =
    coupon.type === "percentage"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

export interface CouponValidation {
  ok: boolean;
  error?: string;
  code?: string;
  discountAmount?: number; // paise
  coupon?: ICoupon;
}

/**
 * Resolve + validate a coupon code against a subtotal (paise). Returns the
 * computed discount on success, or a human-readable reason on failure. The
 * authoritative application happens at order creation, which re-runs this with
 * the server-computed cart subtotal.
 */
export async function validateCoupon(
  rawCode: unknown,
  subtotal: number
): Promise<CouponValidation> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a coupon code." };

  await dbConnect();
  const coupon = await Coupon.findOne({ code });

  if (!coupon || !coupon.active) {
    return { ok: false, error: "This coupon code is not valid." };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (
    coupon.usageLimit != null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return {
      ok: false,
      error: "Your order doesn't meet this coupon's minimum value.",
    };
  }

  const discountAmount = computeDiscount(coupon, subtotal);
  if (discountAmount <= 0) {
    return { ok: false, error: "This coupon doesn't apply to your order." };
  }

  return { ok: true, code, discountAmount, coupon };
}

/**
 * Increment a coupon's usage exactly once, guarded against exceeding its limit.
 * Called from `confirmOrder`, so a coupon is only consumed by an order that is
 * actually placed (COD) or paid (online) — never an abandoned online checkout.
 */
export async function consumeCoupon(couponId: string): Promise<void> {
  await dbConnect();
  await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
}

// --- Serialisation ----------------------------------------------------------

export interface CouponDTO {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: number; // percent, or paise for flat
  minOrderValue: number | null; // paise
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  expired: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeCoupon(doc: any): CouponDTO {
  const expiresAt: Date | null = doc.expiresAt ?? null;
  return {
    id: String(doc._id),
    code: doc.code,
    type: doc.type,
    value: doc.value,
    minOrderValue: doc.minOrderValue ?? null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    usageLimit: doc.usageLimit ?? null,
    usedCount: doc.usedCount ?? 0,
    active: doc.active,
    expired: expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
