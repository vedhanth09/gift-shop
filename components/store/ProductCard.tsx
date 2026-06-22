import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { PublicProduct } from "@/lib/products";
import WishlistButton from "./WishlistButton";

/**
 * Product tile used across the homepage, listing, category and search grids.
 *
 * Reworked into a tinyminymo-style card: a clean square image panel on a soft
 * sand backdrop, a discount flag, a centred title and an emphasised sale price.
 * Borderless on the page so it sits well on any background; only the image
 * panel carries a hairline. Tokens stay on the "Midnight & Camel" palette.
 */
export default function ProductCard({ product }: { product: PublicProduct }) {
  const img = product.images[0];
  const onSale =
    product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = onSale
    ? Math.round(
        ((product.comparePrice! - product.price) / product.comparePrice!) * 100
      )
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col text-center"
    >
      {/* ── Image panel ──────────────────────────────────────────────── */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line-subtle bg-sand-muted transition duration-200 group-hover:border-line-strong group-hover:shadow-sm">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-line-strong">
            <span className="text-5xl">🎁</span>
          </div>
        )}

        {/* Status / discount flag */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {!product.inStock && (
            <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sand backdrop-blur-sm">
              Sold out
            </span>
          )}
          {product.inStock && onSale && (
            <span className="rounded-full bg-bad px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-sand shadow-sm">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        <div className="absolute right-2.5 top-2.5">
          <WishlistButton productId={product.id} variant="icon" />
        </div>
      </div>

      {/* ── Meta ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-1 pt-3">
        {product.category && (
          <p className="text-[11px] uppercase tracking-[0.12em] text-taupe-muted">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink transition group-hover:text-camel">
          {product.title}
        </h3>
        <div className="mt-auto flex items-baseline justify-center gap-2 pt-2">
          <span
            className={`text-base font-semibold tabular-nums ${
              onSale ? "text-bad" : "text-ink"
            }`}
          >
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
