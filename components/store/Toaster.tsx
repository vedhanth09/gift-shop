"use client";

import { useEffect } from "react";
import { useToastStore, type Toast } from "@/store/toastStore";

const TONE: Record<Toast["type"], string> = {
  success: "border-ok/30 bg-ok-bg text-ok-fg",
  error: "border-bad/30 bg-bad-bg text-bad-fg",
  info: "border-line-subtle bg-surface text-ink",
};

/**
 * Fixed toast viewport. Mounted once per layout; reads the global toast store
 * and auto-dismisses each toast after a few seconds.
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${TONE[toast.type]}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
