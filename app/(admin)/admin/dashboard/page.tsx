import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import "@/models/User"; // register schema for populate()
import AdminShell from "@/components/admin/AdminShell";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 5;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warn-bg text-warn-fg",
  processing: "bg-note-bg text-note-fg",
  shipped: "bg-camel/[0.16] text-camel-active",
  delivered: "bg-ok-bg text-ok-fg",
  cancelled: "bg-bad-bg text-bad-fg",
};

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

interface RecentOrder {
  _id: unknown;
  orderNumber: string;
  total: number;
  orderStatus: string;
  createdAt: Date;
  customer?: { name?: string } | null;
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();

  const [revenueAgg, ordersToday, lowStockProducts, recentOrders] =
    await Promise.all([
      Order.aggregate<{ total: number }>([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: startOfToday() } }),
      Product.find({ stock: { $lt: LOW_STOCK_THRESHOLD } })
        .sort({ stock: 1 })
        .select("title stock")
        .limit(10)
        .lean(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("customer", "name")
        .lean<RecentOrder[]>(),
    ]);

  const totalRevenue = revenueAgg[0]?.total ?? 0;

  const cards = [
    { label: "Total revenue", value: formatINR(totalRevenue), hint: "from paid orders" },
    { label: "Orders today", value: String(ordersToday), hint: "since midnight" },
    {
      label: "Low-stock items",
      value: String(lowStockProducts.length),
      hint: `stock < ${LOW_STOCK_THRESHOLD}`,
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line-subtle bg-surface p-5">
            <p className="text-sm text-taupe">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>
            <p className="mt-0.5 text-xs text-taupe-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Recent orders
          </h2>
          <div className="overflow-x-auto rounded-xl border border-line-subtle bg-surface">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-taupe">
                No orders yet.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {recentOrders.map((o) => (
                    <tr key={String(o._id)} className="hover:bg-sand-deep/60">
                      <td className="px-4 py-3 font-medium text-ink">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-taupe">
                        {o.customer?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {formatINR(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[o.orderStatus] ?? "bg-sand-muted text-taupe"
                          }`}
                        >
                          {o.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-taupe">
                        {new Date(o.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Low-stock alerts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Low-stock alerts
          </h2>
          <div className="rounded-xl border border-line-subtle bg-surface">
            {lowStockProducts.length === 0 ? (
              <p className="p-6 text-center text-sm text-taupe">
                Everything is well stocked.
              </p>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {lowStockProducts.map((p) => (
                  <li
                    key={String(p._id)}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <Link
                      href={`/admin/products/${String(p._id)}`}
                      className="truncate text-sm font-medium text-ink hover:text-midnight"
                    >
                      {p.title}
                    </Link>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.stock === 0
                          ? "bg-bad-bg text-bad-fg"
                          : "bg-warn-bg text-warn-fg"
                      }`}
                    >
                      {p.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
