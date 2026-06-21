import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { PublicProduct } from "@/lib/products";
import WishlistButton from "./WishlistButton";

/** Product tile used across the homepage, listing, category and search grids. */
export default function ProductCard({ product }: { product: PublicProduct }) {
  const img = product.images[0];
  const onSale =
    product.comparePrice != null && product.comparePrice > product.price;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line-subtle bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-sand-muted">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.title}
            className="h-full w-full object-cover transition duration-[400ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-line-strong">
            <span className="text-4xl">🎁</span>
          </div>
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-medium text-sand">
            Out of stock
          </span>
        )}
        {product.inStock && onSale && (
          <span className="absolute left-2 top-2 rounded-full bg-camel px-2 py-0.5 text-xs font-semibold text-camel-fg">
            Sale
          </span>
        )}
        <div className="absolute right-2 top-2">
          <WishlistButton productId={product.id} variant="icon" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-xs uppercase tracking-wide text-taupe-muted">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-ink transition group-hover:text-camel">
          {product.title}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-base font-medium tabular-nums text-ink">
            {formatINR(product.price)}
          </span>
          {onSale && (
            <span className="text-xs tabular-nums text-taupe-muted line-through">
              {formatINR(product.comparePrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
