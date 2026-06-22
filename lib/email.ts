import type { IOrder } from "@/models/Order";
import { formatINR } from "@/lib/utils";

/**
 * Transactional email via the Resend REST API (no SDK, consistent with the
 * project's other integrations). A no-op when `RESEND_API_KEY` is unset, so the
 * app runs fine in development without email credentials — sending is always
 * best-effort and never blocks an order.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Giftopia <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/** Send one email. Returns false (never throws) when unconfigured or on error. */
async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
  cod: "Cash on Delivery",
};

/** Order confirmation / receipt email (PRD §Phase 4). */
export async function sendOrderConfirmationEmail(args: {
  to: string;
  name: string;
  order: Pick<
    IOrder,
    | "orderNumber"
    | "items"
    | "total"
    | "discountAmount"
    | "shippingFee"
    | "shippingAddress"
    | "paymentMethod"
    | "paymentStatus"
  >;
}): Promise<boolean> {
  const { to, name, order } = args;

  const rows = order.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;color:#374151;">${escapeHtml(it.title)} × ${it.qty}</td>
          <td style="padding:8px 0;text-align:right;color:#111827;">${formatINR(
            it.price * it.qty
          )}</td>
        </tr>`
    )
    .join("");

  const addr = order.shippingAddress;
  const paid = order.paymentStatus === "paid";

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
    <h1 style="font-size:20px;">Thanks for your order${name ? `, ${escapeHtml(name)}` : ""}!</h1>
    <p style="color:#6b7280;">Your order <strong>${escapeHtml(
      order.orderNumber
    )}</strong> is confirmed.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${rows}
      ${
        order.discountAmount
          ? `<tr><td style="padding:8px 0;color:#16a34a;">Discount</td><td style="padding:8px 0;text-align:right;color:#16a34a;">- ${formatINR(
              order.discountAmount
            )}</td></tr>`
          : ""
      }
      ${
        order.shippingFee
          ? `<tr><td style="padding:8px 0;color:#6b7280;">Shipping</td><td style="padding:8px 0;text-align:right;color:#111827;">${formatINR(
              order.shippingFee
            )}</td></tr>`
          : ""
      }
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:12px 0;font-weight:600;">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:600;">${formatINR(
          order.total
        )}</td>
      </tr>
    </table>

    <p style="color:#6b7280;font-size:14px;">
      Payment: ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
      ${paid ? "(paid)" : "(payment pending)"}
    </p>

    <p style="color:#6b7280;font-size:14px;line-height:1.5;">
      Delivering to:<br/>
      ${escapeHtml(addr.name)}, ${escapeHtml(addr.phone)}<br/>
      ${escapeHtml(addr.line1)}<br/>
      ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.pincode)}
    </p>

    <a href="${APP_URL}/account/orders" style="display:inline-block;margin-top:8px;color:#db2777;font-weight:600;text-decoration:none;">
      View your orders →
    </a>
  </div>`;

  return sendEmail({
    to,
    subject: `Giftopia order ${order.orderNumber} confirmed`,
    html,
  });
}

/** Shared button + wrapper so transactional emails look consistent. */
function actionEmail(args: {
  heading: string;
  body: string;
  buttonLabel: string;
  url: string;
  footer?: string;
}): string {
  const { heading, body, buttonLabel, url, footer } = args;
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
    <h1 style="font-size:20px;">${heading}</h1>
    <p style="color:#374151;line-height:1.6;">${body}</p>
    <a href="${url}" style="display:inline-block;margin:16px 0;border-radius:8px;background:#db2777;color:#ffffff;padding:12px 24px;font-weight:600;text-decoration:none;">
      ${buttonLabel}
    </a>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">
      Or paste this link into your browser:<br/>
      <span style="color:#db2777;word-break:break-all;">${url}</span>
    </p>
    ${footer ? `<p style="color:#9ca3af;font-size:12px;margin-top:16px;">${footer}</p>` : ""}
  </div>`;
}

/** Email-verification link sent on registration / resend (V1.1). */
export async function sendVerificationEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<boolean> {
  const url = `${APP_URL}/account/verify-email?token=${encodeURIComponent(args.token)}`;
  return sendEmail({
    to: args.to,
    subject: "Verify your Giftopia email",
    html: actionEmail({
      heading: `Welcome to Giftopia${args.name ? `, ${escapeHtml(args.name)}` : ""}!`,
      body: "Please confirm your email address to activate your account and start ordering.",
      buttonLabel: "Verify my email",
      url,
      footer: "This link expires in 24 hours. If you didn't create a Giftopia account, you can ignore this email.",
    }),
  });
}

/** Password-reset link sent from the forgot-password flow (V1.1). */
export async function sendPasswordResetEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<boolean> {
  const url = `${APP_URL}/account/reset-password?token=${encodeURIComponent(args.token)}`;
  return sendEmail({
    to: args.to,
    subject: "Reset your Giftopia password",
    html: actionEmail({
      heading: "Reset your password",
      body: `Hi${args.name ? ` ${escapeHtml(args.name)}` : ""}, we received a request to reset your Giftopia password. Click below to choose a new one.`,
      buttonLabel: "Reset password",
      url,
      footer: "This link expires in 1 hour. If you didn't request a reset, your password is unchanged and you can ignore this email.",
    }),
  });
}

/** Escape user-supplied values before interpolating into the email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
