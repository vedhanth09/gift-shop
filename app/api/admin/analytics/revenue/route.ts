import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api";
import { getRevenueReport, normalizePeriod } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * GET /api/admin/analytics/revenue?period=7|30|90
 * Daily paid-revenue series plus totals for the selected window.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const period = normalizePeriod(req.nextUrl.searchParams.get("period"));
  const report = await getRevenueReport(period);
  return NextResponse.json(report);
}
