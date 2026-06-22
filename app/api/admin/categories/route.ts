import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import { requireAdmin, apiError } from "@/lib/api";
import { generateUniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

/** GET /api/admin/categories — list all categories, alphabetical. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const categories = await Category.find().sort({ name: 1 }).lean();
  return NextResponse.json({ categories });
}

/** POST /api/admin/categories — create a category (slug auto-generated). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: { name?: unknown; image?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return apiError("Category name is required.", 400);

  const image = typeof body.image === "string" ? body.image.trim() : "";

  await dbConnect();

  const slug = await generateUniqueSlug(Category, name);
  const category = await Category.create({ name, slug, image: image || undefined });

  return NextResponse.json({ category }, { status: 201 });
}
