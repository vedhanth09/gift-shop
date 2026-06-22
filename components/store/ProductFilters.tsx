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
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

  // Native <select> falls back to the OS control without this: strip the
  // default appearance, leave room for our own chevron, and keep the height
  // identical to the text inputs so the row lines up.
  const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showCategory && (
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
          Category
          <div className="relative">
            <select
              value={params.get("category") ?? ""}
              onChange={(e) => setParam("category", e.target.value)}
              className={selectClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-taupe">
        Sort by
        <div className="relative">
          <select
            value={params.get("sort") ?? "newest"}
            onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
            className={selectClass}
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <Chevron />
        </div>
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

/** Custom dropdown caret — replaces the OS arrow hidden by `appearance-none`. */
function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe"
    >
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}
