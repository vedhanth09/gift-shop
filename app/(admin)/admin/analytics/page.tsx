import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import RevenueChart from "@/components/admin/RevenueChart";
import {
  REVENUE_PERIODS,
  getRevenueReport,
  getTopProducts,
  getAdvancedAnalytics,
  normalizePeriod,
} from "@/lib/analytics";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warn-bg text-warn-fg",
  processing: "bg-note-bg text-note-fg",
  shipped: "bg-camel/[0.16] text-camel-active",
  delivered: "bg-ok-bg text-ok-fg",
  cancelled: "bg-bad-bg text-bad-fg",
};

const PAYMENT_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
  cod: "Cash on Delivery",
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const period = normalizePeriod(searchParams.period);

  const [report, topProducts, advanced] = await Promise.all([
    getRevenueReport(period),
    getTopProducts(10),
    getAdvancedAnalytics(period),
  ]);

  const avgOrder =
    report.orderCount > 0 ? Math.round(report.total / report.orderCount) : 0;
  const maxUnits = Math.max(1, ...topProducts.map((p) => p.units));

  const { statusBreakdown, paymentBreakdown, customers, categories } = advanced;
  const totalStatusOrders = Math.max(
    1,
    statusBreakdown.reduce((sum, s) => sum + s.count, 0)
  );
  const maxCategoryRevenue = Math.max(1, ...categories.map((c) => c.revenue));

  const cards = [
    { label: `Revenue (${period}d)`, value: formatINR(report.total) },
    { label: `Paid orders (${period}d)`, value: String(report.orderCount) },
    { label: "Avg. order value", value: formatINR(avgOrder) },
    { label: "Total customers", value: String(customers.total) },
    { label: `New customers (${period}d)`, value: String(customers.newInPeriod) },
    { label: "Repeat customers", value: String(customers.repeat) },
  ];

  return (
    <AdminShell title="Analytics">
      {/* Period switcher */}
      <div className="mb-5 flex gap-2">
        {REVENUE_PERIODS.map((p) => {
          const active = p === period;
          return (
            <Link
              key={p}
              href={`/admin/analytics?period=${p}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-midnight text-sand"
                  : "bg-surface text-taupe ring-1 ring-line-subtle hover:bg-sand-deep/60"
              }`}
            >
              {p} days
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line-subtle bg-surface p-5">
            <p className="text-sm text-taupe">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
          Revenue
        </h2>
        <RevenueChart points={report.points} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
          Top products by units sold
        </h2>
        <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
          {topProducts.length === 0 ? (
            <p className="p-8 text-center text-sm text-taupe">
              No sales recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 shrink-0 text-sm font-semibold text-taupe-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.title}
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sand-muted">
                      <div
                        className="h-full rounded-full bg-midnight"
                        style={{ width: `${(p.units / maxUnits) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink">
                      {p.units} sold
                    </p>
                    <p className="text-xs text-taupe">{formatINR(p.revenue)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Order status + payment method breakdowns */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Orders by status
          </h2>
          <div className="rounded-xl border border-line-subtle bg-surface p-5">
            <ul className="space-y-3">
              {statusBreakdown.map((s) => (
                <li key={s.status} className="flex items-center gap-3 text-sm">
                  <span
                    className={`inline-flex w-24 justify-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[s.status] ?? "bg-sand-muted text-taupe"
                    }`}
                  >
                    {s.status}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-muted">
                    <div
                      className="h-full rounded-full bg-midnight"
                      style={{ width: `${(s.count / totalStatusOrders) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-ink">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Payment methods
          </h2>
          <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
                <tr>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 text-right font-medium">Orders</th>
                  <th className="px-5 py-3 text-right font-medium">Paid revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {paymentBreakdown.map((p) => (
                  <tr key={p.method}>
                    <td className="px-5 py-3 text-ink">
                      {PAYMENT_LABELS[p.method] ?? p.method}
                    </td>
                    <td className="px-5 py-3 text-right text-taupe">{p.orders}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink">
                      {formatINR(p.paidRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Sales by category */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
          Sales by category
        </h2>
        <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface">
          {categories.length === 0 ? (
            <p className="p-8 text-center text-sm text-taupe">
              No sales recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {categories.map((c) => (
                <li key={c.categoryId} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {c.name}
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sand-muted">
                      <div
                        className="h-full rounded-full bg-midnight"
                        style={{ width: `${(c.revenue / maxCategoryRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink">
                      {formatINR(c.revenue)}
                    </p>
                    <p className="text-xs text-taupe">{c.units} units</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
