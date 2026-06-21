import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api";
import { getAdvancedAnalytics, normalizePeriod } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * GET /api/admin/analytics/summary?period=7|30|90
 * Advanced analytics: order-status & payment-method breakdowns, customer
 * counts, and sales by category (V1.1). Period only affects "new customers".
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const period = normalizePeriod(req.nextUrl.searchParams.get("period"));
  const data = await getAdvancedAnalytics(period);

  return NextResponse.json({ period, ...data });
}
