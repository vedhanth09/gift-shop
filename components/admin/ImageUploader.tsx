"use client";

import { useRef, useState } from "react";

const MAX_IMAGES = 6;

/**
 * Drag-and-drop image uploader. Holds an array of Cloudinary URLs and reports
 * changes via `onChange`. Each file is POSTed to /api/uploads/image as it's
 * added; removing an already-uploaded image DELETEs it from Cloudinary so we
 * don't orphan assets when an admin changes their mind before saving.
 */
export default function ImageUploader({
  value,
  onChange,
  max = MAX_IMAGES,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - value.length;

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (list.length === 0) return;
    if (list.length > remaining) {
      setError(`You can add at most ${max} images (${remaining} slot(s) left).`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads/image", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload failed.");
          break;
        }
        uploaded.push(data.url);
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    onChange(value.filter((u) => u !== url));
    // Best-effort cleanup; the UI has already removed it.
    try {
      await fetch("/api/uploads/image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {
      /* ignore — product save still succeeds without cleanup */
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-line-subtle bg-sand-deep"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-sm text-sand opacity-0 transition group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {value.length < max && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition ${
            dragging
              ? "border-midnight bg-camel/[0.08]"
              : "border-line text-taupe hover:border-midnight hover:bg-camel/[0.08]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span className="font-medium text-taupe">
                Drag &amp; drop images, or click to browse
              </span>
              <span className="mt-1 text-xs text-taupe-muted">
                JPEG, PNG, WebP or AVIF · up to {max} images · max 5 MB each
              </span>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
