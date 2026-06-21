"use client";

import { useEffect, useRef } from "react";
import {
  STRIPE_SRC,
  loadScript,
  type StripeElement,
  type StripeInstance,
} from "@/lib/payment-client";

export type StripeConfirm = (
  clientSecret: string
) => Promise<{ ok: boolean; error?: string }>;

/**
 * Mounts a Stripe Card Element (loaded from the Stripe.js CDN) and lifts a
 * `confirm(clientSecret)` callback to the parent checkout form, so the single
 * "Place order" button can drive card confirmation. Renders a short notice when
 * Stripe isn't configured (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` missing).
 */
export default function StripeCardFields({
  publishableKey,
  onConfirmReady,
}: {
  publishableKey?: string;
  onConfirmReady: (confirm: StripeConfirm | null) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publishableKey) {
      onConfirmReady(null);
      return;
    }

    let card: StripeElement | null = null;
    let cancelled = false;

    (async () => {
      try {
        await loadScript(STRIPE_SRC);
        if (cancelled || !window.Stripe || !cardRef.current) return;

        const stripe: StripeInstance = window.Stripe(publishableKey);
        const elements = stripe.elements();
        card = elements.create("card", {
          style: {
            base: { fontSize: "14px", color: "#1B2436" },
          },
        });
        card.mount(cardRef.current);

        const confirm: StripeConfirm = async (clientSecret) => {
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            { payment_method: { card: card! } }
          );
          if (error) return { ok: false, error: error.message };
          return { ok: paymentIntent?.status === "succeeded" };
        };

        onConfirmReady(confirm);
      } catch {
        onConfirmReady(null);
      }
    })();

    return () => {
      cancelled = true;
      card?.unmount();
      onConfirmReady(null);
    };
  }, [publishableKey, onConfirmReady]);

  if (!publishableKey) {
    return (
      <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">
        Card payments aren&apos;t configured. Please choose another method.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-3">
      <div ref={cardRef} />
    </div>
  );
}
