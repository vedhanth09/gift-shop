import { Schema, model, models, type Model, type Document, type Types } from "mongoose";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  userName: string; // snapshot, so the display name survives profile edits
  rating: number; // 1–5
  comment: string;
  /** True when the reviewer has a non-cancelled order containing this product. */
  verifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per customer per product (the API upserts on this key).
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
// Newest-first listing per product.
ReviewSchema.index({ product: 1, createdAt: -1 });

const Review: Model<IReview> =
  models.Review || model<IReview>("Review", ReviewSchema);

export default Review;
