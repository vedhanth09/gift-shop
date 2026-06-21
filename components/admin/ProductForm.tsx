"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import { paiseToRupees, rupeesToPaise } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductFormData {
  id: string;
  title: string;
  description: string;
  price: number; // paise
  comparePrice?: number; // paise
  category: string; // category id
  stock: number;
  images: string[];
  tags: string[];
  published: boolean;
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";
const labelClass = "mb-1 block text-sm font-medium text-taupe";

export default function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product?: ProductFormData;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(
    product ? String(paiseToRupees(product.price)) : ""
  );
  const [comparePrice, setComparePrice] = useState(
    product?.comparePrice ? String(paiseToRupees(product.comparePrice)) : ""
  );
  const [category, setCategory] = useState(
    product?.category ?? categories[0]?.id ?? ""
  );
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [tags, setTags] = useState((product?.tags ?? []).join(", "));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [published, setPublished] = useState(product?.published ?? false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Create a category first, then assign this product to it.");
      return;
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Enter a valid price.");
      return;
    }

    setSaving(true);
    const payload = {
      title,
      description,
      price: rupeesToPaise(priceNum),
      comparePrice: comparePrice ? rupeesToPaise(Number(comparePrice)) : null,
      category,
      stock: Number(stock) || 0,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images,
      published,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the product.");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-line-subtle bg-surface p-6"
    >
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className={labelClass}>
            Price (₹)
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="comparePrice" className={labelClass}>
            Compare-at price (₹){" "}
            <span className="font-normal text-taupe-muted">optional</span>
          </label>
          <input
            id="comparePrice"
            type="number"
            min="0"
            step="0.01"
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stock" className={labelClass}>
            Stock
          </label>
          <input
            id="stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tags" className={labelClass}>
          Tags <span className="font-normal text-taupe-muted">comma-separated</span>
        </label>
        <input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="birthday, handmade, under-500"
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Images</span>
        <ImageUploader value={images} onChange={setImages} />
      </div>

      <label className="flex items-center gap-2 text-sm text-taupe">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-line text-midnight focus:ring-midnight"
        />
        Published (visible on the storefront)
      </label>

      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-midnight px-5 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-lg border border-line px-5 py-2 text-sm font-medium text-ink transition hover:bg-midnight/[0.06]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
