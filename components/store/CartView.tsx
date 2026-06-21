"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import type { ValidatedCart, ValidatedCartLine } from "@/lib/cart";

/**
 * Cart page. The cart lives in the Zustand store; on every change it is
 * re-validated against the server so prices refresh and unavailable items show
 * a "no longer available" warning that blocks checkout (PRD §17.5).
 */
export default function CartView() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const [validation, setValidation] = useState<ValidatedCart | null>(null);
  const [loading, setLoading] = useState(true);

  const payload = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items]
  );

  const revalidate = useCallback(
    async (signal: AbortSignal) => {
      if (payload.length === 0) {
        setValidation({ lines: [], subtotal: 0, hasIssues: false, checkoutBlocked: false });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
          signal,
        });
        const data = (await res.json()) as ValidatedCart;
        setValidation(data);
      } catch {
        /* aborted/offline — keep last known validation */
      } finally {
        setLoading(false);
      }
    },
    [payload]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void revalidate(controller.signal);
    return () => controller.abort();
  }, [revalidate]);

  const statusFor = useCallback(
    (productId: string): ValidatedCartLine | undefined =>
      validation?.lines.find((l) => l.productId === productId),
    [validation]
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
        <p className="text-4xl">🛒</p>
        <p className="mt-3 text-taupe">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Browse gifts
        </Link>
      </div>
    );
  }

  const subtotal = validation?.subtotal ?? 0;
  const blocked = validation?.checkoutBlocked ?? false;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <ul className="space-y-4 lg:col-span-2">
        {items.map((item) => {
          const status = statusFor(item.productId);
          const unavailable = status ? !status.available : false;
          const price = status?.price ?? item.price;
          const maxQty = status?.available ? status.stock : item.qty;

          return (
            <li
              key={item.productId}
              className={`flex gap-4 rounded-xl border bg-surface p-4 ${
                unavailable ? "border-bad/30" : "border-line-subtle"
              }`}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand-muted">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/products/${item.slug}`}
                    className="text-sm font-medium text-ink hover:text-midnight"
                  >
                    {item.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs font-medium text-taupe-muted hover:text-bad"
                  >
                    Remove
                  </button>
                </div>

                <p className="mt-0.5 text-sm text-taupe">{formatINR(price)}</p>

                {status?.reason && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      unavailable ? "text-bad" : "text-warn-fg"
                    }`}
                  >
                    {status.reason}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty - 1)}
                      disabled={item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="px-2.5 py-1 text-taupe disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty + 1)}
                      disabled={!unavailable && item.qty >= maxQty}
                      aria-label="Increase quantity"
                      className="px-2.5 py-1 text-taupe disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {formatINR(price * item.qty)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-xl border border-line-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-taupe">
          Order summary
        </h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-taupe">Subtotal</span>
          <span className="font-medium text-ink">
            {loading && !validation ? "…" : formatINR(subtotal)}
          </span>
        </div>
        <p className="mt-1 text-xs text-taupe-muted">
          Shipping &amp; taxes calculated at checkout.
        </p>

        {blocked && (
          <p className="mt-4 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad-fg" role="alert">
            Some items are no longer available. Remove them to continue.
          </p>
        )}

        {blocked ? (
          <button
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg bg-sand-muted py-3 text-sm font-semibold text-taupe"
          >
            Proceed to checkout
          </button>
        ) : (
          <Link
            href="/checkout"
            className="mt-4 block rounded-lg bg-midnight py-3 text-center text-sm font-semibold text-sand transition hover:bg-midnight-hover"
          >
            Proceed to checkout
          </Link>
        )}

        <Link
          href="/products"
          className="mt-3 block text-center text-sm text-taupe hover:text-midnight"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
