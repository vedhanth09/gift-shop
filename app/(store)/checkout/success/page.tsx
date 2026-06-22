import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { getCustomerSession } from "@/lib/session";
import { serializeOrder } from "@/lib/orders";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmed · Giftopia",
};

const PAYMENT_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
  cod: "Cash on Delivery",
};

/**
 * Order confirmation page. Reads `?order=GFT-…` and, for the logged-in owner,
 * shows the order summary. Falls back to a generic thank-you when the order
 * can't be resolved (e.g. opened in a different session).
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderNumber = searchParams.order;
  const session = await getCustomerSession();

  let order = null;
  if (orderNumber && session) {
    await dbConnect();
    const doc = await Order.findOne({
      orderNumber,
      customer: session.id,
    }).lean();
    if (doc) order = serializeOrder(doc);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-line-subtle bg-surface p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-midnight text-sand ring-2 ring-camel ring-offset-2 ring-offset-surface">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-display font-semibold text-ink">
          Thank you for your order!
        </h1>
        {orderNumber ? (
          <p className="mt-2 text-taupe">
            Your order{" "}
            <span className="font-semibold text-ink">{orderNumber}</span> has
            been placed. A confirmation email is on its way.
          </p>
        ) : (
          <p className="mt-2 text-taupe">
            Your order has been placed. A confirmation email is on its way.
          </p>
        )}

        {order && (
          <div className="mt-6 rounded-xl border border-line-subtle bg-sand-deep p-5 text-left">
            <ul className="space-y-2">
              {order.items.map((it) => (
                <li
                  key={it.productId}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-taupe">
                    {it.title} <span className="text-taupe-muted">× {it.qty}</span>
                  </span>
                  <span className="shrink-0 text-ink">
                    {formatINR(it.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-taupe">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-ok">
                  <span>Discount</span>
                  <span>− {formatINR(order.discountAmount)}</span>
                </div>
              )}
              {order.shippingFee > 0 && (
                <div className="flex justify-between text-taupe">
                  <span>Shipping</span>
                  <span>{formatINR(order.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-semibold text-ink">
                <span>Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-taupe">
              Payment:{" "}
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
              {order.paymentStatus === "paid"
                ? " · paid"
                : order.paymentMethod === "cod"
                  ? " · pay on delivery"
                  : " · payment pending"}
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
          >
            View my orders
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-midnight px-5 py-2.5 text-sm font-semibold text-midnight transition hover:bg-midnight/[0.06]"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
