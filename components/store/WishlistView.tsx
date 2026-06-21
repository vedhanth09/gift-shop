"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { toast } from "@/store/toastStore";
import { formatINR } from "@/lib/utils";
import type { PublicProduct } from "@/lib/products";

/**
 * Wishlist page body (V1.1): server-rendered saved products with per-item
 * "add to cart" and "remove" actions. Removals update the shared wishlist store
 * (so hearts elsewhere stay in step) and drop the card locally.
 */
export default function WishlistView({ items }: { items: PublicProduct[] }) {
  const [products, setProducts] = useState<PublicProduct[]>(items);
  const addItem = useCartStore((s) => s.addItem);
  const removeFromStore = useWishlistStore((s) => s.remove);
  const setIds = useWishlistStore((s) => s.setIds);

  // Keep the heart store aligned with what the page loaded.
  useEffect(() => {
    setIds(items.map((p) => p.id));
  }, [items, setIds]);

  async function remove(id: string) {
    setProducts((list) => list.filter((p) => p.id !== id));
    removeFromStore(id);
    try {
      await fetch("/api/account/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      /* the optimistic removal stands; a reload will reconcile */
    }
  }

  function addToCart(p: PublicProduct) {
    addItem({
      productId: p.id,
      slug: p.slug,
      title: p.title,
      price: p.price,
      image: p.images[0],
    });
    toast.success(`Added ${p.title} to your cart.`);
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
        <p className="text-taupe">Your wishlist is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products.map((p) => (
        <li
          key={p.id}
          className="flex gap-4 rounded-xl border border-line-subtle bg-surface p-4"
        >
          <Link
            href={`/products/${p.slug}`}
            className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-sand-muted"
          >
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.images[0]}
                alt={p.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-taupe-muted">
                🎁
              </div>
            )}
          </Link>

          <div className="flex min-w-0 flex-1 flex-col">
            <Link
              href={`/products/${p.slug}`}
              className="line-clamp-2 text-sm font-medium text-ink hover:text-midnight"
            >
              {p.title}
            </Link>
            <p className="mt-1 text-sm font-semibold text-ink">
              {formatINR(p.price)}
            </p>
            {!p.inStock && (
              <p className="mt-0.5 text-xs font-medium text-taupe">
                Out of stock
              </p>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <button
                type="button"
                onClick={() => addToCart(p)}
                disabled={!p.inStock}
                className="rounded-lg bg-midnight px-3 py-1.5 text-xs font-semibold text-sand transition hover:bg-midnight-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-taupe transition hover:bg-sand-deep"
              >
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
