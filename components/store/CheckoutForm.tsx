"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import { openRazorpayCheckout } from "@/lib/payment-client";
import StripeCardFields, { type StripeConfirm } from "./StripeCardFields";
import type { ValidatedCart } from "@/lib/cart";

type PaymentMethod = "cod" | "razorpay" | "stripe";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "cod", label: "Cash on Delivery", hint: "Pay when your order arrives" },
  { value: "razorpay", label: "Razorpay", hint: "UPI, cards & netbanking" },
  { value: "stripe", label: "Stripe", hint: "International cards" },
];

const EMPTY_ADDRESS = {
  name: "",
  phone: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
};

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

/**
 * Checkout UI: delivery address → order summary → payment. The page that
 * renders this is login-gated server-side (no guest checkout, PRD §13).
 *
 * On submit it creates the order (POST /api/orders) and then settles payment:
 *   - COD: confirmed on creation → straight to the success page.
 *   - Razorpay: open Checkout, then verify the signature server-side.
 *   - Stripe: confirm the card against a PaymentIntent client secret.
 * The created order is remembered so retrying a dismissed payment reuses it
 * instead of creating duplicates.
 */
export default function CheckoutForm({
  defaultName,
  defaultAddress,
  shippingFee = 0,
  freeShippingThreshold = 0,
}: {
  defaultName: string;
  defaultAddress?: Partial<typeof EMPTY_ADDRESS>;
  shippingFee?: number;
  freeShippingThreshold?: number;
}) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [address, setAddress] = useState({
    ...EMPTY_ADDRESS,
    name: defaultName,
    ...(defaultAddress ?? {}),
  });
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [validation, setValidation] = useState<ValidatedCart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Coupon (PRD §17.6). The applied code is sent to /api/orders, which
  // re-validates it server-side; the discount shown here is a live preview.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const createdOrderRef = useRef<CreatedOrder | null>(null);
  const stripeConfirmRef = useRef<StripeConfirm | null>(null);
  const onStripeReady = useCallback((confirm: StripeConfirm | null) => {
    stripeConfirmRef.current = confirm;
  }, []);

  const payload = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items]
  );

  const revalidate = useCallback(
    async (signal: AbortSignal) => {
      if (payload.length === 0) {
        setValidation({ lines: [], subtotal: 0, hasIssues: false, checkoutBlocked: false });
        return;
      }
      try {
        const res = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
          signal,
        });
        setValidation((await res.json()) as ValidatedCart);
      } catch {
        /* ignore */
      }
    },
    [payload]
  );

  useEffect(() => {
    const controller = new AbortController();
    void revalidate(controller.signal);
    return () => controller.abort();
  }, [revalidate]);

  function update(field: keyof typeof EMPTY_ADDRESS, value: string) {
    setAddress((a) => ({ ...a, [field]: value }));
    // The cart hasn't changed, but a new address shouldn't reuse a stale order.
    createdOrderRef.current = null;
  }

  const blocked = validation?.checkoutBlocked ?? false;
  const subtotal = validation?.subtotal ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  // Mirrors shippingFeeFor() on the server so the preview matches the order.
  const shipping =
    shippingFee > 0 &&
    !(freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold)
      ? shippingFee
      : 0;
  const total = discountedSubtotal + shipping;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, items: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.valid) {
        setAppliedCode(null);
        setCouponDiscount(0);
        setCouponError(data.error ?? "This coupon code is not valid.");
        return;
      }
      setAppliedCode(data.code);
      setCouponDiscount(data.discountAmount);
      createdOrderRef.current = null; // a new discount can't reuse a stale order
    } catch {
      setCouponError("Could not check that coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCode(null);
    setCouponDiscount(0);
    setCouponInput("");
    setCouponError(null);
    createdOrderRef.current = null;
  }

  // Keep the applied discount honest if the cart changes underneath it.
  useEffect(() => {
    if (!appliedCode) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: appliedCode, items: payload }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!data.valid) {
          setAppliedCode(null);
          setCouponDiscount(0);
          setCouponError(data.error ?? "Your coupon is no longer valid.");
        } else {
          setCouponDiscount(data.discountAmount);
        }
      } catch {
        /* aborted/offline — keep the last known discount */
      }
    })();
    return () => controller.abort();
  }, [payload, appliedCode]);

  /** Create the order once, reusing it when retrying the same payment method. */
  async function ensureOrder(): Promise<CreatedOrder> {
    const cached = createdOrderRef.current;
    if (cached && cached.paymentMethod === payment) return cached;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: payload,
        shippingAddress: address,
        paymentMethod: payment,
        couponCode: appliedCode ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Could not place your order. Please try again.");
    }
    const created: CreatedOrder = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      amount: data.amount,
      paymentMethod: payment,
    };
    createdOrderRef.current = created;
    return created;
  }

  function finish(orderNumber: string) {
    createdOrderRef.current = null;
    clear();
    router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
  }

  async function payWithRazorpay(order: CreatedOrder) {
    const res = await fetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Could not start the payment.");
    }

    const success = await openRazorpayCheckout({
      keyId: data.keyId,
      amount: data.amount,
      currency: data.currency,
      razorpayOrderId: data.razorpayOrderId,
      orderNumber: order.orderNumber,
      prefill: { name: address.name, contact: address.phone },
    });

    if (!success) {
      setNotice(
        `Payment cancelled. Your order ${order.orderNumber} is saved — you can pay again anytime.`
      );
      return;
    }

    const verify = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId, ...success }),
    });
    const verifyData = await verify.json().catch(() => ({}));
    if (!verify.ok) {
      throw new Error(verifyData.error ?? "Payment verification failed.");
    }
    finish(order.orderNumber);
  }

  async function payWithStripe(order: CreatedOrder) {
    const confirm = stripeConfirmRef.current;
    if (!confirm) {
      throw new Error("Enter your card details to continue.");
    }
    const res = await fetch("/api/payments/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Could not start the payment.");
    }

    const result = await confirm(data.clientSecret);
    if (!result.ok) {
      throw new Error(result.error ?? "Card payment failed. Please try again.");
    }
    finish(order.orderNumber);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (blocked) {
      setError("Some items are no longer available. Please review your cart.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await ensureOrder();

      if (order.paymentMethod === "cod") {
        finish(order.orderNumber);
      } else if (order.paymentMethod === "razorpay") {
        await payWithRazorpay(order);
      } else {
        await payWithStripe(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
        <p className="text-taupe">Your cart is empty — nothing to check out.</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Browse gifts
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {/* Delivery address */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Delivery address
          </h2>
          <div className="grid gap-4 rounded-xl border border-line-subtle bg-surface p-5 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <input
                required
                value={address.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                required
                type="tel"
                value={address.phone}
                onChange={(e) => update("phone", e.target.value)}
                autoComplete="tel"
                className={inputClass}
              />
            </Field>
            <Field label="Pincode">
              <input
                required
                value={address.pincode}
                onChange={(e) => update("pincode", e.target.value)}
                autoComplete="postal-code"
                className={inputClass}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input
                required
                value={address.line1}
                onChange={(e) => update("line1", e.target.value)}
                autoComplete="address-line1"
                placeholder="House no, street, area"
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <input
                required
                value={address.city}
                onChange={(e) => update("city", e.target.value)}
                autoComplete="address-level2"
                className={inputClass}
              />
            </Field>
            <Field label="State">
              <input
                required
                value={address.state}
                onChange={(e) => update("state", e.target.value)}
                autoComplete="address-level1"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Payment */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Payment method
          </h2>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-surface p-4 transition ${
                  payment === opt.value
                    ? "border-midnight ring-1 ring-midnight"
                    : "border-line-subtle hover:border-line-strong"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={opt.value}
                  checked={payment === opt.value}
                  onChange={() => {
                    setPayment(opt.value);
                    createdOrderRef.current = null;
                    setNotice(null);
                    setError(null);
                  }}
                  className="h-4 w-4 text-midnight focus:ring-midnight"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-taupe">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {payment === "stripe" && (
            <div className="mt-3">
              <StripeCardFields
                publishableKey={STRIPE_PK}
                onConfirmReady={onStripeReady}
              />
            </div>
          )}
        </section>
      </div>

      {/* Order summary */}
      <aside className="h-fit rounded-xl border border-line-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-taupe">
          Order summary
        </h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3 text-sm">
              <span className="text-taupe">
                {item.title}{" "}
                <span className="text-taupe-muted">× {item.qty}</span>
              </span>
              <span className="shrink-0 text-ink">
                {formatINR(item.price * item.qty)}
              </span>
            </li>
          ))}
        </ul>

        {/* Coupon */}
        <div className="mt-4 border-t border-line-subtle pt-4">
          {appliedCode ? (
            <div className="flex items-center justify-between rounded-lg bg-ok-bg px-3 py-2 text-sm">
              <span className="font-medium text-ok-fg">
                Coupon <span className="font-semibold">{appliedCode}</span> applied
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs font-medium text-taupe hover:text-bad"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  setCouponError(null);
                }}
                placeholder="Coupon code"
                aria-label="Coupon code"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm uppercase placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponBusy || !couponInput.trim()}
                className="rounded-lg border border-midnight px-4 py-2 text-sm font-semibold text-midnight transition hover:bg-midnight/[0.06] disabled:opacity-60"
              >
                {couponBusy ? "…" : "Apply"}
              </button>
            </div>
          )}
          {couponError && (
            <p className="mt-2 text-xs text-bad" role="alert">
              {couponError}
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-1.5 border-t border-line-subtle pt-4 text-sm">
          <div className="flex items-center justify-between text-taupe">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-ok-fg">
              <span>Discount</span>
              <span>− {formatINR(couponDiscount)}</span>
            </div>
          )}
          {shippingFee > 0 && (
            <div className="flex items-center justify-between text-taupe">
              <span>Shipping</span>
              <span>{shipping > 0 ? formatINR(shipping) : "Free"}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 text-base font-semibold text-ink">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
        </div>

        {blocked && (
          <p className="mt-4 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad-fg" role="alert">
            Some items are unavailable.{" "}
            <Link href="/cart" className="font-semibold underline">
              Review cart
            </Link>
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad-fg" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-lg bg-note-bg px-3 py-2 text-xs text-note-fg" role="status">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || blocked}
          className="mt-4 w-full rounded-lg bg-midnight py-3 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
        >
          {submitting
            ? "Processing…"
            : payment === "cod"
              ? "Place order"
              : `Pay ${formatINR(total)}`}
        </button>
        <Link
          href="/cart"
          className="mt-3 block text-center text-sm text-taupe hover:text-midnight"
        >
          Back to cart
        </Link>
      </aside>
    </form>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-taupe">{label}</span>
      {children}
    </label>
  );
}
