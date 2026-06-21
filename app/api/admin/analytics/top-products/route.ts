import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { getTopProducts } from "@/lib/analytics";

export const runtime = "nodejs";

/** GET /api/admin/analytics/top-products — top 10 products by units sold. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const products = await getTopProducts(10);
  return NextResponse.json({ products });
}
