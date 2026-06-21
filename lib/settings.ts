import { dbConnect } from "@/lib/db";
import Settings from "@/models/Settings";

/**
 * Store-settings helpers shared by the storefront (footer/contact) and the
 * order/checkout flow (shipping). There is a single settings document; reads
 * fall back to sensible defaults so the app works before the admin saves
 * anything. Money is paise (PRD §7).
 */

export interface StoreSettings {
  storeName: string;
  logoUrl: string;
  contactEmail: string;
  currency: string;
  shippingFee: number; // paise
  freeShippingThreshold: number; // paise, 0 = always charge
  social: { instagram: string; twitter: string; facebook: string };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Giftly",
  logoUrl: "",
  contactEmail: "",
  currency: "INR",
  shippingFee: 0,
  freeShippingThreshold: 0,
  social: { instagram: "", twitter: "", facebook: "" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function merge(doc: any): StoreSettings {
  if (!doc) return { ...DEFAULT_SETTINGS };
  return {
    storeName: doc.storeName || DEFAULT_SETTINGS.storeName,
    logoUrl: doc.logoUrl || "",
    contactEmail: doc.contactEmail || "",
    currency: doc.currency || DEFAULT_SETTINGS.currency,
    shippingFee: doc.shippingFee ?? 0,
    freeShippingThreshold: doc.freeShippingThreshold ?? 0,
    social: {
      instagram: doc.social?.instagram || "",
      twitter: doc.social?.twitter || "",
      facebook: doc.social?.facebook || "",
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The current store settings, merged over defaults. */
export async function getSettings(): Promise<StoreSettings> {
  await dbConnect();
  const doc = await Settings.findOne({ key: "store" }).lean();
  return merge(doc);
}

/**
 * Shipping fee (paise) for a given subtotal: the flat fee, waived once the
 * order reaches the free-shipping threshold (when one is configured).
 */
export function shippingFeeFor(
  settings: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">,
  subtotal: number
): number {
  if (settings.shippingFee <= 0) return 0;
  if (
    settings.freeShippingThreshold > 0 &&
    subtotal >= settings.freeShippingThreshold
  ) {
    return 0;
  }
  return settings.shippingFee;
}
