"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Filter/sort controls for the product listing. State lives in the URL query
 * (shareable + server-rendered): changing a control pushes a new query and the
 * server page re-renders the matching products. Used on /products (with the
 * category selector) and /categories/[slug] (without it).
 */
export default function ProductFilters({
  categories,
  showCategory = true,
}: {
  categories: CategoryOption[];
  showCategory?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");

  function apply(next: URLSearchParams) {
    next.delete("page"); // any filter change resets pagination
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  }

  function applyPrice(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (min) next.set("min", min);
    else next.delete("min");
    if (max) next.set("max", max);
    else next.delete("max");
    apply(next);
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showCategory && (
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
          Category
          <select
            value={params.get("category") ?? ""}
            onChange={(e) => setParam("category", e.target.value)}
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
        Sort by
        <select
          value={params.get("sort") ?? "newest"}
          onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
          className={inputClass}
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>

      <form onSubmit={applyPrice} className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
          Min ₹
          <input
            type="number"
            min="0"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
          Max ₹
          <input
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-taupe transition hover:bg-sand-muted"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
