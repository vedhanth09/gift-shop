"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/utils";

export interface ProductRow {
  id: string;
  title: string;
  price: number; // paise
  stock: number;
  published: boolean;
  thumbnail: string | null;
  categoryName: string;
}

type BulkAction = "publish" | "unpublish" | "delete";

export default function ProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-select state for bulk actions.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))
    );
  }

  async function togglePublish(p: ProductRow) {
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${p.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !p.published }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not update publish state.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: ProductRow) {
    if (!window.confirm(`Delete "${p.title}"? This also removes its images.`)) {
      return;
    }
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not delete the product.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function runBulk(action: BulkAction) {
    if (selectedIds.length === 0) return;
    if (
      action === "delete" &&
      !window.confirm(
        `Delete ${selectedIds.length} product${
          selectedIds.length > 1 ? "s" : ""
        }? This also removes their images and can't be undone.`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Bulk action failed.");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
        <p className="text-taupe">No products yet.</p>
        <Link
          href="/admin/products/new"
          className="mt-3 inline-block rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Add your first product
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg" role="alert">
          {error}
        </p>
      )}

      {/* Bulk action toolbar — visible once at least one row is selected. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-midnight/30 bg-camel/[0.16] px-4 py-2.5">
          <span className="text-sm font-medium text-midnight-active">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => runBulk("publish")}
              disabled={bulkBusy}
              className="rounded-md border border-line bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:bg-sand-deep/60 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={() => runBulk("unpublish")}
              disabled={bulkBusy}
              className="rounded-md border border-line bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:bg-sand-deep/60 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              onClick={() => runBulk("delete")}
              disabled={bulkBusy}
              className="rounded-md border border-line bg-surface px-3 py-1 text-xs font-medium text-bad transition hover:bg-bad/[0.08] disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
              className="rounded-md px-3 py-1 text-xs font-medium text-taupe transition hover:text-ink disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line-subtle bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all products"
                  className="h-4 w-4 rounded border-line text-midnight focus:ring-midnight"
                />
              </th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {products.map((p) => {
              const checked = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={checked ? "bg-camel/[0.16]" : "hover:bg-sand-deep/60"}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.title}`}
                      className="h-4 w-4 rounded border-line text-midnight focus:ring-midnight"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-sand-muted">
                        {p.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium text-ink">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-taupe">{p.categoryName}</td>
                  <td className="px-4 py-3 text-ink">{formatINR(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock < 5 ? "text-bad" : "text-taupe"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.published
                          ? "bg-ok-bg text-ok-fg"
                          : "bg-sand-muted text-taupe"
                      }`}
                    >
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePublish(p)}
                        disabled={busyId === p.id}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-midnight/[0.06] disabled:opacity-50"
                      >
                        {p.published ? "Unpublish" : "Publish"}
                      </button>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-midnight/[0.06]"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => remove(p)}
                        disabled={busyId === p.id}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-bad transition hover:bg-bad/[0.08] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
