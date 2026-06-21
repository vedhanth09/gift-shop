"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

/**
 * Slim banner shown across the storefront when a signed-in customer hasn't
 * confirmed their email yet (V1.1). Email verification is required before
 * checkout, so this nudges them and offers a one-click resend. Hidden for
 * guests and verified users; also hides itself once a resend succeeds.
 */
export default function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // `emailVerified === false` is the only "show" state — undefined (unknown,
  // still loading, or a legacy account) stays hidden to avoid false alarms.
  if (dismissed || !user || user.emailVerified !== false) return null;

  async function resend() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not send the email. Please try again.");
        return;
      }
      if (data.alreadyVerified) {
        if (user) setUser({ ...user, emailVerified: true });
        toast.success("Your email is verified.");
      } else {
        toast.success("Verification email sent — check your inbox.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-warn/30 bg-warn-bg" role="status">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-warn-fg sm:px-6">
        <span className="font-medium">Please verify your email</span>
        <span className="text-warn-fg">
          to place orders. We sent a link to {user.email}.
        </span>
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="ml-auto font-semibold text-warn-fg underline underline-offset-2 hover:text-warn disabled:opacity-60"
        >
          {busy ? "Sending…" : "Resend link"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-warn hover:text-warn-fg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
