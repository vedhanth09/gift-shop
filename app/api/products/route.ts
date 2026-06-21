import { NextResponse, type NextRequest } from "next/server";
import { rupeesToPaise } from "@/lib/utils";
import { queryPublishedProducts } from "@/lib/products";

export const runtime = "nodejs";

/**
 * GET /api/products
 * Public catalogue of published products. Supports:
 *   ?category=<slug>  ?sort=newest|price-asc|price-desc
 *   ?q=<text>         ?page=<n>
 *   ?min=<rupees>     ?max=<rupees>   (price filter, in rupees)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const min = parseRupees(searchParams.get("min"));
  const max = parseRupees(searchParams.get("max"));

  const result = await queryPublishedProducts({
    categorySlug: searchParams.get("category")?.trim() || undefined,
    sort: searchParams.get("sort") || undefined,
    q: searchParams.get("q")?.trim() || undefined,
    page: Number(searchParams.get("page")) || 1,
    min,
    max,
  });

  return NextResponse.json(result);
}

/** Parse a rupee query value into paise, ignoring blanks/invalid input. */
function parseRupees(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return rupeesToPaise(n);
}
