"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/utils";
import type { CouponDTO } from "@/lib/coupons";

const EMPTY_FORM = {
  code: "",
  type: "percentage" as "percentage" | "flat",
  value: "",
  minOrderValue: "",
  expiresAt: "",
  usageLimit: "",
};

/**
 * Admin coupon management: create coupons (percentage/flat, optional expiry,
 * usage limit and minimum order value) and delete them. Mirrors the
 * CategoryManager pattern — fetches the API and refreshes the server component.
 */
export default function CouponManager({ coupons }: { coupons: CouponDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minOrderValue: form.minOrderValue || undefined,
          expiresAt: form.expiresAt || undefined,
          usageLimit: form.usageLimit || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create coupon.");
        return;
      }
      setForm({ ...EMPTY_FORM });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(coupon: CouponDTO) {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not delete coupon.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form
        onSubmit={create}
        className="grid gap-4 rounded-xl border border-line-subtle bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">Code</span>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="WELCOME10"
            className={`${inputClass} uppercase`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">Type</span>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value as "percentage" | "flat")}
            className={inputClass}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">
            {form.type === "percentage" ? "Percent off" : "Amount off (₹)"}
          </span>
          <input
            type="number"
            min="0"
            step={form.type === "percentage" ? "1" : "0.01"}
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder={form.type === "percentage" ? "10" : "200"}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">
            Min order (₹) <span className="text-taupe-muted">· optional</span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.minOrderValue}
            onChange={(e) => set("minOrderValue", e.target.value)}
            placeholder="500"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">
            Expires <span className="text-taupe-muted">· optional</span>
          </span>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-taupe">
            Usage limit <span className="text-taupe-muted">· optional</span>
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value)}
            placeholder="Unlimited"
            className={inputClass}
          />
        </label>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy || !form.code.trim() || !form.value}
            className="rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
          >
            Create coupon
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg" role="alert">
          {error}
        </p>
      )}

      {/* List */}
      <div className="overflow-x-auto rounded-xl border border-line-subtle bg-surface">
        {coupons.length === 0 ? (
          <p className="p-8 text-center text-sm text-taupe">
            No coupons yet. Create one above.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Min order</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {coupons.map((c) => {
                const inactive = !c.active || c.expired;
                return (
                  <tr key={c.id} className="hover:bg-sand-deep/60">
                    <td className="px-4 py-3 font-medium text-ink">{c.code}</td>
                    <td className="px-4 py-3 text-taupe">
                      {c.type === "percentage"
                        ? `${c.value}% off`
                        : `${formatINR(c.value)} off`}
                    </td>
                    <td className="px-4 py-3 text-taupe">
                      {c.minOrderValue ? formatINR(c.minOrderValue) : "—"}
                    </td>
                    <td className="px-4 py-3 text-taupe">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-taupe">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          inactive
                            ? "bg-sand-muted text-taupe"
                            : "bg-ok-bg text-ok-fg"
                        }`}
                      >
                        {c.expired ? "expired" : c.active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(c)}
                        disabled={busy}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-bad transition hover:bg-bad/[0.08] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
