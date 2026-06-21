"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import StarRating from "./StarRating";
import type { PublicReview, ReviewSummary } from "@/lib/reviews";

/**
 * Reviews block on the product detail page (V1.1): rating summary with a
 * per-star distribution, the list of reviews, and a write-a-review form for
 * signed-in customers (one review each — re-submitting edits the existing one).
 */
export default function ProductReviews({
  slug,
  initialSummary,
  initialReviews,
}: {
  slug: string;
  initialSummary: ReviewSummary;
  initialReviews: PublicReview[];
}) {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState(initialSummary);
  const [reviews, setReviews] = useState(initialReviews);

  const mine = user ? reviews.find((r) => r.userName === user.name) : undefined;
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please pick a star rating.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save your review.");
        return;
      }
      // Re-fetch the list so the new/edited review and order are reflected.
      const listed = await fetch(`/api/products/${slug}/reviews`).then((r) =>
        r.json()
      );
      setSummary(listed.summary ?? data.summary);
      setReviews(listed.reviews ?? []);
      setOpen(false);
      toast.success("Thanks for your review!");
    } finally {
      setBusy(false);
    }
  }

  const total = Math.max(1, summary.count);

  return (
    <section className="mt-16" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-5 text-xl font-display font-semibold text-ink">
        Ratings &amp; reviews
      </h2>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        {/* Summary */}
        <div className="rounded-xl border border-line-subtle bg-surface p-5">
          {summary.count === 0 ? (
            <p className="text-sm text-taupe">No reviews yet.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink">
                  {summary.average.toFixed(1)}
                </span>
                <span className="text-sm text-taupe">out of 5</span>
              </div>
              <StarRating value={summary.average} className="mt-1" />
              <p className="mt-1 text-xs text-taupe">
                {summary.count} review{summary.count > 1 ? "s" : ""}
              </p>

              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution[star - 1];
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-taupe">{star}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-muted">
                        <div
                          className="h-full rounded-full bg-camel"
                          style={{ width: `${(n / total) * 100}%` }}
                        />
                      </div>
                      <span className="w-5 text-right text-taupe-muted">{n}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Write-a-review entry point */}
          <div className="mt-5 border-t border-line-subtle pt-4">
            {user ? (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
              >
                {mine ? "Edit your review" : "Write a review"}
              </button>
            ) : (
              <Link
                href={`/account/login?from=/products/${slug}`}
                className="block rounded-lg border border-line px-4 py-2 text-center text-sm font-semibold text-taupe transition hover:bg-sand-deep"
              >
                Sign in to review
              </Link>
            )}
          </div>
        </div>

        {/* List + form */}
        <div>
          {open && (
            <form
              onSubmit={submit}
              className="mb-6 rounded-xl border border-line-subtle bg-surface p-5"
            >
              <p className="mb-2 text-sm font-medium text-taupe">
                Your rating
              </p>
              <StarRating value={rating} onChange={setRating} size="lg" />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share what you liked (optional)…"
                className="mt-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-midnight px-5 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Submit review"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-taupe transition hover:bg-sand-deep"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-taupe">
              Be the first to review this product.
            </p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-line-subtle bg-surface p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StarRating value={r.rating} size="sm" />
                      <span className="text-sm font-semibold text-ink">
                        {r.userName}
                      </span>
                      {r.verifiedPurchase && (
                        <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[10px] font-medium text-ok-fg">
                          Verified purchase
                        </span>
                      )}
                    </div>
                    <time className="text-xs text-taupe-muted">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  {r.comment && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-taupe">
                      {r.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
