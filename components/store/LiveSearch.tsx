"use client";

import { useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import type { PublicProduct } from "@/lib/products";

/**
 * Live product search (PRD: "live search by name + description"). Typing
 * debounces a request to /api/products?q=…, which matches title, description
 * and tags across published products.
 */
export default function LiveSearch({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.products ?? []);
        setSearched(true);
      } catch {
        /* aborted or network error — ignore */
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for gifts by name or description…"
          aria-label="Search products"
          className="w-full rounded-full border border-line bg-surface py-3 pl-5 pr-12 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
        />
        {loading && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-taupe-muted">
            Searching…
          </span>
        )}
      </div>

      {!q.trim() && (
        <p className="text-sm text-taupe">
          Start typing to search the catalogue.
        </p>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-taupe">
          No products match “{q.trim()}”.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-taupe">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
