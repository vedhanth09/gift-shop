import { Schema, model, models, type Model, type Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  type: "percentage" | "flat";
  value: number;
  minOrderValue?: number;
  expiresAt?: Date;
  usageLimit?: number | null; // null = unlimited
  usedCount: number;
  active: boolean;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ["percentage", "flat"], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, min: 0 },
  expiresAt: { type: Date },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
});

const Coupon: Model<ICoupon> =
  models.Coupon || model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
