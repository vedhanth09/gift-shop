import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { serializeOrder } from "@/lib/orders";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My orders · Giftly",
};

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

export default async function AccountOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?from=/account/orders");

  await dbConnect();
  const docs = await Order.find({ customer: session.id })
    .sort({ createdAt: -1 })
    .lean();
  const orders = docs.map((d) => serializeOrder(d));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">My orders</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/account/wishlist"
            className="text-sm font-medium text-midnight hover:underline"
          >
            Wishlist
          </Link>
          <Link
            href="/account/settings"
            className="text-sm font-medium text-midnight hover:underline"
          >
            Account settings →
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-taupe">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-line-subtle bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{o.orderNumber}</p>
                  <p className="text-xs text-taupe">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[o.orderStatus] ?? "bg-sand-muted text-taupe"
                    }`}
                  >
                    {o.orderStatus}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      PAYMENT_STYLES[o.paymentStatus] ?? "bg-sand-muted text-taupe"
                    }`}
                  >
                    payment: {o.paymentStatus}
                  </span>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-line-subtle pt-4 text-sm">
                {o.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-3">
                    <span className="text-taupe">
                      {it.title} <span className="text-taupe-muted">× {it.qty}</span>
                    </span>
                    <span className="shrink-0 text-ink">
                      {formatINR(it.price * it.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-line-subtle pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatINR(o.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
