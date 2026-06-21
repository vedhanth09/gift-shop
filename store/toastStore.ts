import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/**
 * Tiny global toast store. UI feedback for form submissions and cart actions
 * (PRD §Phase 5 "toast notifications"). The `<Toaster />` mounted in the store
 * layout and admin shell renders these and auto-dismisses them.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nextId++, type, message }],
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers usable from anywhere on the client. */
export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
  info: (message: string) => useToastStore.getState().push("info", message),
};
