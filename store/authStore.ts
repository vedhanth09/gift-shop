import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  emailVerified?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  /** Hydrate from the httpOnly session cookie via /api/auth/me. */
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Client-side mirror of the customer session. The source of truth remains the
 * httpOnly cookie; this store only caches the profile for UI rendering.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      set({ user: data.user ?? null });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));
