"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "verifying" | "success" | "error" | "missing";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-display font-semibold text-ink">Verifying your email…</h1>
      </div>
    </main>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard against the StrictMode double-invoke

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error ?? "We couldn't verify your email.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    })();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-xl border border-line-subtle bg-surface p-8 text-center shadow-sm">
        {status === "verifying" && (
          <>
            <h1 className="text-xl font-display font-semibold text-ink">Verifying your email…</h1>
            <p className="mt-2 text-sm text-taupe">One moment, please.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-display font-semibold text-ink">Email verified</h1>
            <p className="mt-2 text-sm text-taupe">
              Thanks! Your account is now fully active.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
            >
              Start shopping
            </Link>
          </>
        )}

        {(status === "error" || status === "missing") && (
          <>
            <h1 className="text-xl font-display font-semibold text-ink">
              {status === "missing" ? "No verification token" : "Verification failed"}
            </h1>
            <p className="mt-2 text-sm text-taupe">
              {status === "missing"
                ? "This page needs a verification link from your email."
                : message}
            </p>
            <p className="mt-4 text-sm text-taupe">
              You can request a new link from your account, or{" "}
              <Link href="/account/login" className="font-medium text-midnight hover:underline">
                log in
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
