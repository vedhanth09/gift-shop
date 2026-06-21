import { create } from "zustand";

/**
 * Client mirror of the customer's wishlist ids, used to render heart state on
 * product cards and the detail page without re-fetching. The server (User.wishlist)
 * stays the source of truth; `WishlistSync` hydrates this on login and resets it
 * on logout. Mutations are optimistic — the toggle button calls the API and
 * updates this store immediately.
 */
interface WishlistState {
  ids: string[];
  loaded: boolean;
  setIds: (ids: string[]) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  loaded: false,

  setIds: (ids) => set({ ids, loaded: true }),

  add: (id) =>
    set((s) => (s.ids.includes(id) ? s : { ids: [id, ...s.ids] })),

  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),

  has: (id) => get().ids.includes(id),

  reset: () => set({ ids: [], loaded: false }),
}));
