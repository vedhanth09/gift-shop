"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
}

export default function CategoryManager({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), image: newImage[0] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create category.");
        return;
      }
      setNewName("");
      setNewImage([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), image: editImage[0] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not rename category.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(cat: CategoryRow) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete category.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <form
        onSubmit={create}
        className="space-y-3 rounded-xl border border-line-subtle bg-surface p-4"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
        />
        <div>
          <span className="mb-1.5 block text-xs font-medium text-taupe">
            Category image{" "}
            <span className="font-normal text-taupe-muted">optional</span>
          </span>
          <ImageUploader value={newImage} onChange={setNewImage} max={1} />
        </div>
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
        >
          Add category
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
        {categories.length === 0 ? (
          <p className="p-6 text-center text-sm text-taupe">
            No categories yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {categories.map((cat) => (
              <li key={cat.id} className="px-4 py-3">
                {editingId === cat.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
                      autoFocus
                    />
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-taupe">
                        Category image{" "}
                        <span className="font-normal text-taupe-muted">optional</span>
                      </span>
                      <ImageUploader
                        value={editImage}
                        onChange={setEditImage}
                        max={1}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(cat.id)}
                        disabled={busy}
                        className="rounded-md bg-midnight px-3 py-1 text-xs font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink transition hover:bg-midnight/[0.06]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {cat.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.image}
                          alt=""
                          className="h-12 w-12 flex-none rounded-lg border border-line-subtle object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border border-line-subtle bg-sand-deep font-display text-lg font-semibold text-midnight/30">
                          {cat.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{cat.name}</p>
                        <p className="text-xs text-taupe-muted">/{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex flex-none gap-2">
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                          setEditImage(cat.image ? [cat.image] : []);
                          setError(null);
                        }}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink transition hover:bg-midnight/[0.06]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(cat)}
                        disabled={busy}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-bad transition hover:bg-bad/[0.08] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
