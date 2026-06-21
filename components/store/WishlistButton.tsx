"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { toast } from "@/store/toastStore";

/**
 * Heart toggle for saving a product to the wishlist (V1.1). Two looks:
 *  - "icon": a floating heart used as an overlay on product cards
 *  - "full": a labelled button for the product detail page
 *
 * Saving requires an account, so guests are sent to the login page (returning to
 * wherever they were). State is optimistic and mirrored in `useWishlistStore`.
 */
export default function WishlistButton({
  productId,
  variant = "icon",
  className = "",
}: {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const saved = useWishlistStore((s) => s.ids.includes(productId));
  const add = useWishlistStore((s) => s.add);
  const remove = useWishlistStore((s) => s.remove);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // Cards wrap the button in a <Link>; don't navigate when the heart is hit.
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/account/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    const next = !saved;
    // Optimistic update, rolled back if the request fails.
    if (next) add(productId);
    else remove(productId);
    setBusy(true);
    try {
      const res = await fetch("/api/account/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error();
      if (next) toast.success("Saved to your wishlist.");
    } catch {
      if (next) remove(productId);
      else add(productId);
      toast.error("Could not update your wishlist.");
    } finally {
      setBusy(false);
    }
  }

  const label = saved ? "Remove from wishlist" : "Save to wishlist";

  const heart = (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? "border-camel bg-camel/[0.16] text-camel-active"
            : "border-line text-taupe hover:bg-sand-deep"
        } ${className}`}
      >
        {heart}
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 shadow-sm backdrop-blur transition hover:bg-surface disabled:opacity-60 ${
        saved ? "text-bad" : "text-taupe hover:text-bad"
      } ${className}`}
    >
      {heart}
    </button>
  );
}
