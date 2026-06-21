import type { MetadataRoute } from "next";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

/**
 * robots.txt (PRD §Phase 5). Crawlers may index the public storefront but not
 * the admin surface, customer account area, cart/checkout or API routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/cart", "/checkout"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
