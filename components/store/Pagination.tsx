import Link from "next/link";

/**
 * Server-rendered prev/next pager. Preserves the current query string (filters,
 * sort, search) and only sets `?page=` for pages beyond the first.
 */
export default function Pagination({
  basePath,
  query,
  page,
  pages,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass =
    "rounded-lg border border-line px-4 py-2 text-sm font-medium text-taupe transition hover:bg-sand-muted";
  const disabledClass =
    "rounded-lg border border-line-subtle px-4 py-2 text-sm font-medium text-taupe-muted";

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className={disabledClass}>← Previous</span>
      )}

      <span className="text-sm text-taupe">
        Page {page} of {pages}
      </span>

      {page < pages ? (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          Next →
        </Link>
      ) : (
        <span className={disabledClass}>Next →</span>
      )}
    </nav>
  );
}
