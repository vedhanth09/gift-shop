import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Review from "@/models/Review";
import User from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { sanitizeText } from "@/lib/sanitize";
import {
  getProductReviews,
  getReviewSummary,
  hasPurchased,
  serializeReview,
} from "@/lib/reviews";

export const runtime = "nodejs";

const MAX_COMMENT = 1000;

/** Resolve a published product id from its slug, or null. */
async function publishedProductId(slug: string): Promise<string | null> {
  await dbConnect();
  const product = await Product.findOne({ slug, published: true })
    .select("_id")
    .lean<{ _id: unknown } | null>();
  return product ? String(product._id) : null;
}

/**
 * GET /api/products/[slug]/reviews
 * Public: the rating summary plus newest-first reviews for a published product.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const productId = await publishedProductId(params.slug);
  if (!productId) return apiError("Product not found.", 404);

  const [summary, reviews] = await Promise.all([
    getReviewSummary(productId),
    getProductReviews(productId),
  ]);

  return NextResponse.json({ summary, reviews });
}

/**
 * POST /api/products/[slug]/reviews  Body: { rating, comment? }
 * Create or update the signed-in customer's review (one per product). Reviews
 * from customers who have ordered the product are flagged as verified purchases.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getCustomerSession();
  if (!session) return apiError("Please sign in to write a review.", 401);

  const productId = await publishedProductId(params.slug);
  if (!productId) return apiError("Product not found.", 404);

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const rating = Math.floor(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return apiError("Please give a rating between 1 and 5 stars.", 400);
  }

  const comment = sanitizeText(body.comment).slice(0, MAX_COMMENT);

  await dbConnect();

  const user = await User.findById(session.id).select("name").lean<{
    name: string;
  } | null>();
  if (!user) return apiError("Account not found.", 404);

  const verifiedPurchase = await hasPurchased(session.id, productId);

  const review = await Review.findOneAndUpdate(
    { product: productId, user: session.id },
    {
      $set: { userName: user.name, rating, comment, verifiedPurchase },
      $setOnInsert: { product: productId, user: session.id },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const summary = await getReviewSummary(productId);

  return NextResponse.json(
    { review: serializeReview(review), summary },
    { status: 201 }
  );
}
