/**
 * Browser-only payment helpers: lazy-load the Razorpay/Stripe checkout scripts
 * from their CDNs (no npm SDK, consistent with the project) and drive the
 * Razorpay Checkout modal. Imported only by client components.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccess) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface StripeInstance {
  elements: () => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data: { payment_method: { card: StripeElement } }
  ) => Promise<{
    error?: { message?: string };
    paymentIntent?: { status?: string };
  }>;
}

export interface StripeElements {
  create: (type: "card", options?: Record<string, unknown>) => StripeElement;
}

export interface StripeElement {
  mount: (selector: string | HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (e: any) => void) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const loaded = new Map<string, Promise<void>>();

/** Inject a `<script>` once and resolve when it has loaded. */
export function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loaded.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.body.appendChild(el);
  });

  loaded.set(src, promise);
  return promise;
}

export const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";
export const STRIPE_SRC = "https://js.stripe.com/v3/";

/**
 * Open Razorpay Checkout and resolve with the success payload, or null if the
 * customer dismisses the modal without paying.
 */
export async function openRazorpayCheckout(opts: {
  keyId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  orderNumber: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpaySuccess | null> {
  await loadScript(RAZORPAY_SRC);
  if (!window.Razorpay) throw new Error("Razorpay failed to load.");

  return new Promise<RazorpaySuccess | null>((resolve) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      name: "Giftly",
      description: `Order ${opts.orderNumber}`,
      order_id: opts.razorpayOrderId,
      prefill: opts.prefill,
      theme: { color: "#db2777" },
      handler: (response) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (!settled) resolve(null);
        },
      },
    });
    rzp.open();
  });
}
