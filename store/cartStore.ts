import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number; // smallest currency unit (paise)
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  /** Replace the whole cart (used when hydrating from the server). */
  setItems: (items: CartItem[]) => void;
  /** Merge another cart into this one, summing quantities (login sync). */
  mergeItems: (items: CartItem[]) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

/**
 * Cart persisted to localStorage (PRD: "Persisted cart"). DB sync when logged
 * in is layered on in Phase 3 — this store is the client source of truth.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      setQty: (productId, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        })),

      setItems: (items) => set({ items }),

      mergeItems: (incoming) =>
        set((state) => {
          const merged = [...state.items];
          for (const item of incoming) {
            const existing = merged.find((i) => i.productId === item.productId);
            if (existing) {
              existing.qty += item.qty;
            } else {
              merged.push(item);
            }
          }
          return { items: merged };
        }),

      clear: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: "giftly-cart" }
  )
);
