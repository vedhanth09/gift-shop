"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

// Mirrors the server-side transition matrix in lib/orders.ts.
const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const LABELS: Record<OrderStatus, string> = {
  pending: "Mark pending",
  processing: "Start processing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

/**
 * Admin control on the order detail page: advance the order through its
 * lifecycle (or cancel it) and record a COD payment, via
 * PATCH /api/admin/orders/[id]/status. Refreshes the server component on success.
 */
export default function OrderStatusControl({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = ORDER_FLOW[orderStatus] ?? [];
  const canMarkPaid = paymentStatus === "pending" && orderStatus !== "cancelled";

  async function patch(body: Record<string, string>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update the order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (nextStatuses.length === 0 && !canMarkPaid) {
    return (
      <p className="text-sm text-taupe">
        This order is {orderStatus} — no further actions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => {
          const danger = status === "cancelled";
          return (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={() =>
                patch(
                  { status },
                  danger
                    ? "Cancel this order? Reserved stock will be restored."
                    : undefined
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                danger
                  ? "border border-line text-bad hover:bg-bad/[0.08]"
                  : "bg-midnight text-sand hover:bg-midnight-hover"
              }`}
            >
              {LABELS[status]}
            </button>
          );
        })}
      </div>

      {canMarkPaid && (
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ paymentStatus: "paid" })}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-midnight/[0.06] disabled:opacity-60"
        >
          Mark payment received
          {paymentMethod === "cod" ? " (COD)" : ""}
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
