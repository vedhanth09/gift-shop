import { NextResponse, type NextRequest } from "next/server";
import { getPublishedProductBySlug, getRelatedProducts } from "@/lib/products";

export const runtime = "nodejs";

/**
 * GET /api/products/[slug]
 * A single published product by slug, plus up to 4 related products from the
 * same category. Unpublished or missing slugs return 404.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const product = await getPublishedProductBySlug(params.slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const related = await getRelatedProducts(product);
  return NextResponse.json({ product, related });
}
