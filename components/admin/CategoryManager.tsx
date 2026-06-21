"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export default function CategoryManager({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create category.");
        return;
      }
      setNewName("");
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
        body: JSON.stringify({ name: editName.trim() }),
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
        className="flex gap-2 rounded-xl border border-line-subtle bg-surface p-4"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
        >
          Add
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
              <li
                key={cat.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
                      autoFocus
                    />
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
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-ink">{cat.name}</p>
                      <p className="text-xs text-taupe-muted">/{cat.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                          setError(null);
                        }}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink transition hover:bg-midnight/[0.06]"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => remove(cat)}
                        disabled={busy}
                        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-bad transition hover:bg-bad/[0.08] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
