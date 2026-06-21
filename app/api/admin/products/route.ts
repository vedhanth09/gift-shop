import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import { requireAdmin, apiError } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/slug";
import { parseProductBody, type ProductBody } from "@/lib/product-validation";

export const runtime = "nodejs";

/**
 * GET /api/admin/products
 * List every product (published + unpublished), newest first. Supports an
 * optional `?q=` title search and `?published=true|false` filter for the table.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const published = searchParams.get("published");

  const filter: Record<string, unknown> = {};
  if (q) filter.title = { $regex: q, $options: "i" };
  if (published === "true") filter.published = true;
  if (published === "false") filter.published = false;

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .populate("category", "name slug")
    .lean();

  return NextResponse.json({ products });
}

/**
 * POST /api/admin/products
 * Create a product. The slug is auto-generated from the title (unique).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: ProductBody;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  await dbConnect();

  const parsed = await parseProductBody(body, false);
  if ("error" in parsed) return apiError(parsed.error, 400);

  const slug = await generateUniqueSlug(Product, parsed.data.title as string);

  const product = await Product.create({ ...parsed.data, slug });

  return NextResponse.json({ product }, { status: 201 });
}
