import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedProductBySlug, getRelatedProducts } from "@/lib/products";
import { getReviewSummary, getProductReviews } from "@/lib/reviews";
import { formatINR } from "@/lib/utils";
import ProductGallery from "@/components/store/ProductGallery";
import AddToCartButton from "@/components/store/AddToCartButton";
import WishlistButton from "@/components/store/WishlistButton";
import StarRating from "@/components/store/StarRating";
import ProductReviews from "@/components/store/ProductReviews";
import ProductCard from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getPublishedProductBySlug(params.slug);
  if (!product) return { title: "Product not found · Giftly" };
  return {
    title: `${product.title} · Giftly`,
    description: product.description.slice(0, 160) || `Buy ${product.title} at Giftly.`,
    openGraph: {
      title: product.title,
      images: product.images.length ? [product.images[0]] : undefined,
    },
  };
}

/** Product detail: gallery, price, stock status, description, add to cart. */
export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getPublishedProductBySlug(params.slug);
  if (!product) notFound();

  const [related, reviewSummary, reviews] = await Promise.all([
    getRelatedProducts(product),
    getReviewSummary(product.id),
    getProductReviews(product.id),
  ]);
  const onSale =
    product.comparePrice != null && product.comparePrice > product.price;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-taupe">
        <Link href="/products" className="hover:text-midnight">
          Shop
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-midnight"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-xs font-medium uppercase tracking-wide text-midnight hover:underline"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-display font-semibold text-ink">{product.title}</h1>

          {reviewSummary.count > 0 && (
            <a
              href="#reviews-heading"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-taupe hover:text-midnight"
            >
              <StarRating value={reviewSummary.average} size="sm" />
              <span className="font-medium">{reviewSummary.average.toFixed(1)}</span>
              <span className="text-taupe-muted">
                ({reviewSummary.count} review{reviewSummary.count > 1 ? "s" : ""})
              </span>
            </a>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-ink">
              {formatINR(product.price)}
            </span>
            {onSale && (
              <span className="text-lg text-taupe-muted line-through">
                {formatINR(product.comparePrice!)}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="mt-3">
            {product.inStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-medium text-ok-fg">
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-muted px-3 py-1 text-xs font-medium text-taupe">
                Out of stock
              </span>
            )}
          </div>

          {product.description && (
            <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-taupe">
              {product.description}
            </div>
          )}

          <div className="mt-8 space-y-3">
            <AddToCartButton product={product} />
            <WishlistButton
              productId={product.id}
              variant="full"
              className="w-full sm:w-auto sm:px-8"
            />
          </div>
        </div>
      </div>

      {/* Ratings & reviews */}
      <ProductReviews
        slug={product.slug}
        initialSummary={reviewSummary}
        initialReviews={reviews}
      />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-display font-semibold text-ink">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
