import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User, { type IAddress } from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import CheckoutForm from "@/components/store/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout · Giftopia",
};

/**
 * Checkout requires a logged-in customer (no guest checkout, PRD §13). The
 * gate is server-side: unauthenticated visitors are sent to login with a
 * ?from=/checkout return path. The cart itself is read client-side. The
 * customer's default saved address pre-fills the form, and store settings
 * supply the shipping fee shown in the summary.
 */
export default async function CheckoutPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?from=/checkout");

  await dbConnect();
  const [user, settings] = await Promise.all([
    User.findById(session.id)
      .select("name addresses")
      .lean<{ name: string; addresses?: IAddress[] } | null>(),
    getSettings(),
  ]);

  const addresses = user?.addresses ?? [];
  const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
  const defaultAddress = preferred
    ? {
        phone: preferred.phone,
        line1: preferred.line1,
        city: preferred.city,
        state: preferred.state,
        pincode: preferred.pincode,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink">Checkout</h1>
      <CheckoutForm
        defaultName={user?.name ?? ""}
        defaultAddress={defaultAddress}
        shippingFee={settings.shippingFee}
        freeShippingThreshold={settings.freeShippingThreshold}
      />
    </div>
  );
}
