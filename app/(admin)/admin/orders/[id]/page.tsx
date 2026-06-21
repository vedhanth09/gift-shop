import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User"; // register schema for populate()
import AdminShell from "@/components/admin/AdminShell";
import OrderStatusControl from "@/components/admin/OrderStatusControl";
import { isValidObjectId, serializeOrder } from "@/lib/orders";
import { formatINR } from "@/lib/utils";

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

const PAYMENT_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
  cod: "Cash on Delivery",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!isValidObjectId(params.id)) notFound();

  await dbConnect();
  const doc = await Order.findById(params.id)
    .populate("customer", "name email")
    .lean();
  if (!doc) notFound();

  const order = serializeOrder(doc, { includeCustomer: true });
  const addr = order.shippingAddress;

  return (
    <AdminShell
      title={order.orderNumber}
      actions={
        <Link
          href="/admin/orders"
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-midnight/[0.06]"
        >
          ← All orders
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            STATUS_STYLES[order.orderStatus] ?? "bg-sand-muted text-taupe"
          }`}
        >
          {order.orderStatus}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            PAYMENT_STYLES[order.paymentStatus] ?? "bg-sand-muted text-taupe"
          }`}
        >
          payment: {order.paymentStatus}
        </span>
        <span className="text-sm text-taupe">
          Placed {new Date(order.createdAt).toLocaleString("en-IN")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <section className="rounded-xl border border-line-subtle bg-surface">
            <h2 className="border-b border-line-subtle px-5 py-3 text-sm font-semibold uppercase tracking-wide text-taupe">
              Items
            </h2>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line-subtle">
                {order.items.map((it) => (
                  <tr key={it.productId}>
                    <td className="px-5 py-3 text-ink">{it.title}</td>
                    <td className="px-5 py-3 text-taupe">
                      {formatINR(it.price)} × {it.qty}
                    </td>
                    <td className="px-5 py-3 text-right text-ink">
                      {formatINR(it.price * it.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line-subtle text-sm">
                <tr>
                  <td className="px-5 py-2 text-taupe" colSpan={2}>
                    Subtotal
                  </td>
                  <td className="px-5 py-2 text-right text-ink">
                    {formatINR(order.subtotal)}
                  </td>
                </tr>
                {order.discountAmount > 0 && (
                  <tr>
                    <td className="px-5 py-2 text-ok" colSpan={2}>
                      Discount
                    </td>
                    <td className="px-5 py-2 text-right text-ok">
                      − {formatINR(order.discountAmount)}
                    </td>
                  </tr>
                )}
                {order.shippingFee > 0 && (
                  <tr>
                    <td className="px-5 py-2 text-taupe" colSpan={2}>
                      Shipping
                    </td>
                    <td className="px-5 py-2 text-right text-ink">
                      {formatINR(order.shippingFee)}
                    </td>
                  </tr>
                )}
                <tr className="font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-right">{formatINR(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Status actions */}
          <section className="rounded-xl border border-line-subtle bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
              Update order
            </h2>
            <OrderStatusControl
              orderId={order.id}
              orderStatus={order.orderStatus}
              paymentStatus={order.paymentStatus}
              paymentMethod={order.paymentMethod}
            />
          </section>
        </div>

        {/* Customer + delivery + payment */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-line-subtle bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-taupe">
              Customer
            </h2>
            <p className="text-sm font-medium text-ink">
              {order.customer?.name || "—"}
            </p>
            <p className="text-sm text-taupe">{order.customer?.email || "—"}</p>
          </section>

          <section className="rounded-xl border border-line-subtle bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-taupe">
              Delivery address
            </h2>
            <p className="text-sm leading-relaxed text-taupe">
              {addr.name}
              <br />
              {addr.phone}
              <br />
              {addr.line1}
              <br />
              {addr.city}, {addr.state} {addr.pincode}
            </p>
          </section>

          <section className="rounded-xl border border-line-subtle bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-taupe">
              Payment
            </h2>
            <p className="text-sm text-taupe">
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
            {order.paymentRef && (
              <p className="mt-1 break-all text-xs text-taupe-muted">
                Ref: {order.paymentRef}
              </p>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
