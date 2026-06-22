import type { Metadata } from "next";
import CartView from "@/components/store/CartView";

export const metadata: Metadata = {
  title: "Your cart · Giftopia",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink">Your cart</h1>
      <CartView />
    </div>
  );
}
