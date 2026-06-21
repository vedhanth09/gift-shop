import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

/** Friendly 404 shown for unmatched routes and `notFound()` calls (PRD §Phase 5). */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-sand px-4 text-center"
    >
      <p className="text-6xl">🎁</p>
      <h1 className="mt-6 text-3xl font-display font-semibold tracking-tight text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-taupe">
        The page you&apos;re looking for may have moved or no longer exists.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-lg bg-midnight px-6 py-3 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Back to home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-midnight px-6 py-3 text-sm font-semibold text-midnight transition hover:bg-midnight/[0.06]"
        >
          Browse gifts
        </Link>
      </div>
    </main>
  );
}
