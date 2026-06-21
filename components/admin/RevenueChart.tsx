import { formatINR } from "@/lib/utils";
import type { RevenuePoint } from "@/lib/analytics";

/**
 * Lightweight dependency-free revenue bar chart. A plain SVG keeps the bundle
 * small (no charting library) while remaining responsive and accessible — each
 * bar carries a `<title>` tooltip with its exact date and amount.
 */
export default function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const count = points.length || 1;
  const gap = count > 45 ? 1 : 2;
  const barWidth = (100 - gap * (count - 1)) / count;

  if (points.every((p) => p.revenue === 0)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line bg-surface text-sm text-taupe">
        No paid revenue in this period yet.
      </div>
    );
  }

  const labelEvery = Math.ceil(count / 6);

  return (
    <div className="rounded-xl border border-line-subtle bg-surface p-5">
      <svg
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label="Daily revenue"
      >
        {points.map((p, i) => {
          const h = (p.revenue / max) * 36;
          const x = i * (barWidth + gap);
          return (
            <rect
              key={p.date}
              x={x}
              y={38 - h}
              width={barWidth}
              height={Math.max(h, p.revenue > 0 ? 0.5 : 0)}
              rx={0.4}
              className="fill-midnight"
            >
              <title>{`${p.date}: ${formatINR(p.revenue)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-taupe-muted">
        {points
          .filter((_, i) => i % labelEvery === 0 || i === count - 1)
          .map((p) => (
            <span key={p.date}>
              {new Date(p.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          ))}
      </div>
    </div>
  );
}
