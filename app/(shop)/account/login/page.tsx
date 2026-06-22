"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CustomerLoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const router = useRouter();
  // Only honour same-site return paths to avoid open redirects.
  const from =
    searchParams.from && searchParams.from.startsWith("/")
      ? searchParams.from
      : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-display font-semibold text-ink">Welcome back</h1>
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
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-taupe">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-taupe">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-line text-midnight focus:ring-midnight"
              />
              Remember me
            </label>
            <Link
              href="/account/forgot-password"
              className="text-sm font-medium text-midnight hover:underline"
            >
              Forgot password?
            </Link>
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
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-taupe">
          New to Giftopia?{" "}
          <Link href="/account/register" className="font-medium text-midnight hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
