import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay + Stripe clients built on the REST API + Node crypto, so we don't
 * pull in either SDK (consistent with `lib/cloudinary.ts`). Secrets never leave
 * the server. All signature checks use `timingSafeEqual` to avoid leaking
 * comparison timing (PRD §9: "verify all payment webhooks with HMAC signature").
 *
 * Amounts are integer paise — the same unit Razorpay and Stripe expect for INR.
 */

// --- Razorpay ---------------------------------------------------------------

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export function isRazorpayConfigured(): boolean {
  return Boolean(RZP_KEY_ID && RZP_KEY_SECRET);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Create a Razorpay order to attach to our pending order. Throws if unconfigured. */
export async function createRazorpayOrder(params: {
  amount: number;
  currency?: string;
  receipt: string;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured.");
  }

  const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? "INR",
      receipt: params.receipt,
    }),
  });

  const data = (await res.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };

  if (!res.ok || !data.id) {
    throw new Error(data.error?.description || "Razorpay order creation failed.");
  }
  return {
    id: data.id,
    amount: data.amount ?? params.amount,
    currency: data.currency ?? params.currency ?? "INR",
  };
}

/**
 * Verify the checkout handshake signature returned to the browser:
 * HMAC-SHA256(`<order_id>|<payment_id>`, key_secret) === signature.
 */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  if (!RZP_KEY_SECRET) return false;
  const expected = createHmac("sha256", RZP_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify a webhook payload: HMAC-SHA256(rawBody, webhook_secret) === header. */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!RZP_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", RZP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

// --- Stripe -----------------------------------------------------------------

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_TOLERANCE_SECONDS = 5 * 60;

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET);
}

export interface StripeIntent {
  id: string;
  clientSecret: string;
}

/** Create a PaymentIntent. Throws if unconfigured. */
export async function createStripePaymentIntent(params: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<StripeIntent> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  const form = new URLSearchParams();
  form.set("amount", String(params.amount));
  form.set("currency", (params.currency ?? "inr").toLowerCase());
  form.set("automatic_payment_methods[enabled]", "true");
  for (const [k, v] of Object.entries(params.metadata ?? {})) {
    form.set(`metadata[${k}]`, v);
  }

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = (await res.json()) as {
    id?: string;
    client_secret?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.id || !data.client_secret) {
    throw new Error(data.error?.message || "Stripe intent creation failed.");
  }
  return { id: data.id, clientSecret: data.client_secret };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StripeWebhookResult {
  ok: boolean;
  event?: { type: string; data: { object: any } };
}

/**
 * Verify a Stripe webhook signature without the SDK. The `Stripe-Signature`
 * header is `t=<ts>,v1=<sig>[,v1=<sig>]`; the signed payload is `<ts>.<rawBody>`
 * HMAC-SHA256'd with the webhook secret. Also enforces a timestamp tolerance to
 * reject replays.
 */
export function verifyStripeWebhook(
  rawBody: string,
  sigHeader: string | null
): StripeWebhookResult {
  if (!STRIPE_WEBHOOK_SECRET || !sigHeader) return { ok: false };

  const parts = sigHeader.split(",").map((p) => p.trim());
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return { ok: false };

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > STRIPE_TOLERANCE_SECONDS) {
    return { ok: false };
  }

  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (!signatures.some((sig) => safeEqualHex(expected, sig))) {
    return { ok: false };
  }

  try {
    return { ok: true, event: JSON.parse(rawBody) };
  } catch {
    return { ok: false };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// --- Helpers ----------------------------------------------------------------

/** Constant-time compare of two hex digests of equal byte length. */
function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  let ba: Buffer;
  let bb: Buffer;
  try {
    ba = Buffer.from(a, "hex");
    bb = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
