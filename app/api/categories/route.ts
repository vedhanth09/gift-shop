import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";

export const runtime = "nodejs";
// Reads the database per request; never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/categories
 * Public, alphabetical list of categories for the storefront nav and filters.
 */
export async function GET() {
  await dbConnect();
  const docs = await Category.find().sort({ name: 1 }).lean();

  const categories = docs.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    image: c.image ?? null,
  }));

  return NextResponse.json({ categories });
}
