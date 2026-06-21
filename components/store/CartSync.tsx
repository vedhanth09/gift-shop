"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore, type CartItem } from "@/store/cartStore";

/**
 * Invisible mount in the storefront layout. It hydrates the customer session
 * once, then keeps the cart synced both ways (PRD Phase 3 "DB sync when logged
 * in"):
 *  - on login, the server cart and the local cart are merged, so items added
 *    while signed out survive;
 *  - afterwards, local changes are debounced back to the server.
 * Guests keep working entirely against localStorage.
 */
const PUSH_DELAY = 600;

export default function CartSync() {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const user = useAuthStore((s) => s.user);

  const ready = useRef(false);
  const syncedFor = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushCart = useCallback(async () => {
    const items = useCartStore
      .getState()
      .items.map((i) => ({ productId: i.productId, qty: i.qty }));
    try {
      await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* keep the local cart authoritative if the network blips */
    }
  }, []);

  const schedulePush = useCallback(() => {
    if (!ready.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(pushCart, PUSH_DELAY);
  }, [pushCart]);

  // Hydrate the session once.
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Reconcile carts on login; reset the sync gate on logout.
  useEffect(() => {
    if (!user) {
      ready.current = false;
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cart");
        if (res.ok) {
          const data = await res.json();
          const serverItems: CartItem[] = data.items ?? [];
          const local = useCartStore.getState().items;
          if (local.length === 0) {
            useCartStore.getState().setItems(serverItems);
          } else if (serverItems.length > 0) {
            useCartStore.getState().mergeItems(serverItems);
          }
        }
      } catch {
        /* ignore — local cart still works */
      } finally {
        if (!cancelled) {
          ready.current = true;
          void pushCart();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pushCart]);

  // Mirror local cart changes to the server while logged in.
  useEffect(() => {
    if (!user) return;
    const unsub = useCartStore.subscribe(schedulePush);
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, schedulePush]);

  return null;
}
