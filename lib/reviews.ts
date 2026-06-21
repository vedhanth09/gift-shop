import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Review from "@/models/Review";
import Order from "@/models/Order";

/**
 * Product-review helpers shared by the `/api/products/[slug]/reviews` route and
 * the product detail page, so the rating summary is computed one way (V1.1).
 */

export interface PublicReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  average: number; // 0 when no reviews; rounded to 1 decimal
  /** Number of reviews per star, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeReview(doc: any): PublicReview {
  return {
    id: String(doc._id),
    userName: doc.userName,
    rating: doc.rating,
    comment: doc.comment ?? "",
    verifiedPurchase: Boolean(doc.verifiedPurchase),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Rating count + average + per-star distribution for one product. */
export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  await dbConnect();

  const rows = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let count = 0;
  let weighted = 0;
  for (const row of rows) {
    const star = row._id;
    if (star >= 1 && star <= 5) {
      distribution[star - 1] = row.count;
      count += row.count;
      weighted += star * row.count;
    }
  }

  const average = count > 0 ? Math.round((weighted / count) * 10) / 10 : 0;
  return { count, average, distribution };
}

/** Newest-first reviews for a product. */
export async function getProductReviews(
  productId: string,
  limit = 50
): Promise<PublicReview[]> {
  await dbConnect();
  const docs = await Review.find({ product: productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map(serializeReview);
}

/** Whether a customer has a non-cancelled order containing this product. */
export async function hasPurchased(
  userId: string,
  productId: string
): Promise<boolean> {
  await dbConnect();
  const order = await Order.exists({
    customer: userId,
    "items.productId": productId,
    orderStatus: { $ne: "cancelled" },
  });
  return Boolean(order);
}
