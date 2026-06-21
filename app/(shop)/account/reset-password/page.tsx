"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-display font-semibold text-ink">Reset password</h1>
      </div>
    </main>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not reset your password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/account/login"), 1800);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-display font-semibold text-ink">Reset password</h1>

        {!token ? (
          <>
            <p className="mt-4 rounded-lg bg-bad-bg px-3 py-3 text-sm text-bad-fg border border-bad/30">
              This page needs a valid reset link from your email.
            </p>
            <p className="mt-4 text-center text-sm text-taupe">
              <Link
                href="/account/forgot-password"
                className="font-medium text-midnight hover:underline"
              >
                Request a new link
              </Link>
            </p>
          </>
        ) : done ? (
          <p className="mt-4 rounded-lg bg-ok-bg px-3 py-3 text-sm text-ok-fg">
            Your password has been reset. Redirecting you to login…
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-taupe">Choose a new password.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-taupe">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-taupe">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg border border-bad/30" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-midnight py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
