import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import CartSync from "@/components/store/CartSync";
import WishlistSync from "@/components/store/WishlistSync";
import VerifyEmailBanner from "@/components/store/VerifyEmailBanner";
import Toaster from "@/components/store/Toaster";
import { getSettings } from "@/lib/settings";

/**
 * Shared chrome for every customer-facing storefront page: header (with cart +
 * account state), footer, and the invisible CartSync mount that hydrates the
 * session and keeps the cart in step with the server. The /account/* auth
 * pages live in a separate route group, so they stay chrome-free.
 *
 * Store name, contact email and social links come from the admin-configurable
 * store settings (PRD §Phase 5).
 */
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col bg-sand">
      <CartSync />
      <WishlistSync />
      <StoreHeader storeName={settings.storeName} />
      <VerifyEmailBanner />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <StoreFooter
        storeName={settings.storeName}
        contactEmail={settings.contactEmail}
        social={settings.social}
      />
      <Toaster />
    </div>
  );
}
