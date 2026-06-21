import { NextResponse, type NextRequest } from "next/server";
import {
  verifyToken,
  signToken,
  cookieOptions,
  CUSTOMER_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  CUSTOMER_TOKEN_TTL,
  CUSTOMER_REFRESH_TTL,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Rotates the customer session: validates the refresh token, then issues a
 * fresh access token AND a fresh refresh token (rotation) per PRD §9.2.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token." }, { status: 401 });
  }

  const session = await verifyToken(refreshToken, true);
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
  }

  const [token, refresh] = await Promise.all([
    signToken({ id: session.id, role: "customer" }, CUSTOMER_TOKEN_TTL),
    signToken({ id: session.id, role: "customer" }, CUSTOMER_REFRESH_TTL, true),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions(CUSTOMER_TOKEN_TTL));
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, refresh, cookieOptions(CUSTOMER_REFRESH_TTL));
  return res;
}
