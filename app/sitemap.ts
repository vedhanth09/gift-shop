import type { MetadataRoute } from "next";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";

export const dynamic = "force-dynamic";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Dynamic sitemap covering the public storefront: static pages plus every
 * published product and category (PRD §Phase 5 SEO). Admin, account, cart,
 * checkout and API routes are intentionally excluded (see robots.ts). Falls
 * back to the static routes if the database is unreachable at generation time.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/search`, changeFrequency: "weekly", priority: 0.4 },
  ];

  try {
    await dbConnect();
    const [products, categories] = await Promise.all([
      Product.find({ published: true })
        .select("slug updatedAt")
        .lean<{ slug: string; updatedAt?: Date }[]>(),
      Category.find().select("slug").lean<{ slug: string }[]>(),
    ]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${BASE_URL}/categories/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
