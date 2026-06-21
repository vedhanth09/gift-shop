"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import SearchBox from "./SearchBox";

/**
 * Sticky storefront header: the Seal mark + wordmark, primary nav, search,
 * account and cart. The cart count and account state come from client stores,
 * so they render only after mount to avoid hydration mismatches.
 */
export default function StoreHeader({ storeName = "Giftly" }: { storeName?: string }) {
  const totalItems = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle bg-sand/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={storeName}>
          {/* The Seal — circular wax emblem, camel monogram on midnight */}
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight font-display text-base font-semibold text-camel"
            style={{ boxShadow: "inset 0 0 0 1.5px #B58A4A, inset 0 0 0 3px #1F2D44" }}
            aria-hidden
          >
            G
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            {storeName}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-taupe md:flex">
          <Link href="/products" className="transition hover:text-ink">
            Shop
          </Link>
        </nav>

        <div className="ml-auto hidden flex-1 max-w-xs sm:block">
          <SearchBox />
        </div>

        <Link
          href={mounted && user ? "/account/wishlist" : "/account/login"}
          className="flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-camel"
          aria-label="Wishlist"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="hidden lg:inline">Wishlist</span>
        </Link>

        <Link
          href={mounted && user ? "/account/orders" : "/account/login"}
          className="flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-camel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <span className="hidden lg:inline">
            {mounted && user ? user.name.split(" ")[0] : "Account"}
          </span>
        </Link>

        <Link
          href="/cart"
          className="relative flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-camel"
          aria-label={`Cart with ${mounted ? totalItems : 0} items`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>
          {mounted && totalItems > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-midnight px-1 text-[10px] font-bold text-sand">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
