"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-display font-semibold text-ink">Forgot password</h1>

        {sent ? (
          <>
            <p className="mt-4 rounded-lg bg-ok-bg px-3 py-3 text-sm text-ok-fg">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a
              password reset link. It expires in 1 hour.
            </p>
            <p className="mt-4 text-center text-sm text-taupe">
              <Link href="/account/login" className="font-medium text-midnight hover:underline">
                Back to login
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-taupe">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-taupe">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-taupe">
              Remembered it?{" "}
              <Link href="/account/login" className="font-medium text-midnight hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
