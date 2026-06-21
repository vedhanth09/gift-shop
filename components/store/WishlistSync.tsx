"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";

/**
 * Invisible mount in the storefront layout. Hydrates the wishlist-id store once
 * the customer session is known, so heart toggles across the site render the
 * right state; clears it on logout. Guests carry no wishlist (saving requires an
 * account), so this is a no-op until they sign in.
 */
export default function WishlistSync() {
  const user = useAuthStore((s) => s.user);
  const setIds = useWishlistStore((s) => s.setIds);
  const reset = useWishlistStore((s) => s.reset);

  useEffect(() => {
    if (!user) {
      reset();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/wishlist");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setIds(data.ids ?? []);
      } catch {
        /* ignore — hearts just stay unfilled until next load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, setIds, reset]);

  return null;
}
