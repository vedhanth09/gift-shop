import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User"; // register schema for populate()
import AdminShell from "@/components/admin/AdminShell";
import { ORDER_STATUSES, ORDERS_PAGE_SIZE, serializeOrder } from "@/lib/orders";
import { formatINR } from "@/lib/utils";
import type { OrderStatus } from "@/models/Order";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warn-bg text-warn-fg",
  processing: "bg-note-bg text-note-fg",
  shipped: "bg-camel/[0.16] text-camel-active",
  delivered: "bg-ok-bg text-ok-fg",
  cancelled: "bg-bad-bg text-bad-fg",
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-ok-bg text-ok-fg",
  pending: "bg-warn-bg text-warn-fg",
  failed: "bg-bad-bg text-bad-fg",
  refunded: "bg-sand-muted text-taupe",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: cap(s) })),
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const statusParam = searchParams.status;
  const activeStatus =
    statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? statusParam
      : "";
  const page = Math.max(1, Math.floor(Number(searchParams.page) || 1));

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (activeStatus) filter.orderStatus = activeStatus;

  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ORDERS_PAGE_SIZE)
      .limit(ORDERS_PAGE_SIZE)
      .populate("customer", "name email")
      .lean(),
    Order.countDocuments(filter),
  ]);

  const orders = docs.map((d) => serializeOrder(d, { includeCustomer: true }));
  const pages = Math.ceil(total / ORDERS_PAGE_SIZE);

  const hrefFor = (status: string, p = 1) => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <AdminShell title="Orders">
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === activeStatus;
          return (
            <Link
              key={f.value || "all"}
              href={hrefFor(f.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-midnight text-sand"
                  : "bg-surface text-taupe ring-1 ring-line-subtle hover:bg-sand-deep/60"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line-subtle bg-surface">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-taupe">
            No orders{activeStatus ? ` with status “${activeStatus}”` : ""} yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-sand-deep/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-ink hover:text-midnight"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-taupe">
                    {o.customer?.name || o.customer?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatINR(o.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        PAYMENT_STYLES[o.paymentStatus] ?? "bg-sand-muted text-taupe"
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
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

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-taupe">
          <span>
            Page {page} of {pages} · {total} orders
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={hrefFor(activeStatus, page - 1)}
                className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-midnight/[0.06]"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={hrefFor(activeStatus, page + 1)}
                className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-midnight/[0.06]"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
