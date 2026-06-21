"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { paiseToRupees } from "@/lib/utils";
import type { StoreSettings } from "@/lib/settings";

/**
 * Store-settings editor. Money fields are shown/entered in rupees and the
 * server stores paise (PRD §7). Saves via PUT /api/admin/settings.
 */
export default function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    storeName: settings.storeName,
    logoUrl: settings.logoUrl,
    contactEmail: settings.contactEmail,
    currency: settings.currency,
    shippingFee: settings.shippingFee ? String(paiseToRupees(settings.shippingFee)) : "",
    freeShippingThreshold: settings.freeShippingThreshold
      ? String(paiseToRupees(settings.freeShippingThreshold))
      : "",
    instagram: settings.social.instagram,
    twitter: settings.social.twitter,
    facebook: settings.social.facebook,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          logoUrl: form.logoUrl,
          contactEmail: form.contactEmail,
          currency: form.currency,
          shippingFee: form.shippingFee || 0,
          freeShippingThreshold: form.freeShippingThreshold || 0,
          social: {
            instagram: form.instagram,
            twitter: form.twitter,
            facebook: form.facebook,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

  return (
    <form
      onSubmit={save}
      className="grid max-w-3xl gap-5 rounded-xl border border-line-subtle bg-surface p-6 sm:grid-cols-2"
    >
      <Field label="Store name">
        <input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Contact email">
        <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Logo URL" className="sm:col-span-2">
        <input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" className={inputClass} />
      </Field>
      <Field label="Currency code">
        <input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} className={inputClass} />
      </Field>
      <div />
      <Field label="Shipping fee (₹)">
        <input type="number" min="0" step="0.01" value={form.shippingFee} onChange={(e) => set("shippingFee", e.target.value)} placeholder="0" className={inputClass} />
      </Field>
      <Field label="Free shipping over (₹)">
        <input type="number" min="0" step="0.01" value={form.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", e.target.value)} placeholder="0 = always charge" className={inputClass} />
      </Field>

      <p className="sm:col-span-2 -mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-taupe-muted">
        Social links
      </p>
      <Field label="Instagram">
        <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" className={inputClass} />
      </Field>
      <Field label="Twitter / X">
        <input value={form.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://x.com/…" className={inputClass} />
      </Field>
      <Field label="Facebook">
        <input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" className={inputClass} />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-medium text-ok">Saved.</span>}
        {error && (
          <span className="text-sm text-bad" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-taupe">{label}</span>
      {children}
    </label>
  );
}
