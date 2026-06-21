"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { toast } from "@/store/toastStore";
import type { PublicProduct } from "@/lib/products";

/**
 * Quantity stepper + "Add to cart" for the product detail page. Quantity is
 * capped at available stock; stock is decremented for real only on the
 * payment-success webhook (PRD §17.3), so this is a soft client-side guard.
 */
export default function AddToCartButton({ product }: { product: PublicProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product.inStock) {
    return (
      <button
        disabled
        className="w-full rounded-lg bg-sand-muted py-3 text-sm font-semibold text-taupe sm:w-auto sm:px-10"
      >
        Out of stock
      </button>
    );
  }

  const max = Math.max(1, product.stock);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        image: product.images[0],
      },
      qty
    );
    setAdded(true);
    toast.success(`Added ${qty} × ${product.title} to your cart.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="px-3 py-2 text-lg text-taupe disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max}
            aria-label="Increase quantity"
            className="px-3 py-2 text-lg text-taupe disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 rounded-lg bg-midnight py-3 text-sm font-semibold text-sand transition hover:bg-midnight-hover sm:flex-none sm:px-10"
        >
          Add to cart
        </button>
      </div>

      {product.stock <= 5 && (
        <p className="text-xs font-medium text-warn-fg">
          Only {product.stock} left in stock
        </p>
      )}

      {added && (
        <p className="flex items-center gap-2 text-sm text-ok-fg" role="status">
          Added to cart ·{" "}
          <Link href="/cart" className="font-semibold text-midnight hover:underline">
            View cart →
          </Link>
        </p>
      )}
    </div>
  );
}
