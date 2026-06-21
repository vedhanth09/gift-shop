"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/**
 * Route-level error boundary (PRD §Phase 5 "graceful 500 page"). Reports the
 * error to Sentry and offers a retry. Must be a client component.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-sand px-4 text-center"
    >
      <p className="text-6xl">😵</p>
      <h1 className="mt-6 text-3xl font-display font-semibold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-taupe">
        An unexpected error occurred. Please try again — if it keeps happening,
        come back in a little while.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-lg bg-midnight px-6 py-3 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-midnight px-6 py-3 text-sm font-semibold text-midnight transition hover:bg-midnight/[0.06]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
