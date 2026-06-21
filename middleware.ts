import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyToken } from "@/lib/auth";

/**
 * Server-side protection for the admin surface (PRD §9.1).
 *
 * - All /admin/* pages require a valid admin JWT, except /admin/login.
 *   Unauthenticated visitors are redirected to /admin/login.
 * - All /api/admin/* routes require a valid admin JWT, except the auth
 *   endpoints (login/logout). Unauthenticated callers get a 401.
 *
 * Runs on the Edge runtime, so it uses jose (via verifyToken) — never bcrypt
 * or mongoose here. Individual handlers still re-check the role server-side.
 */

const PUBLIC_ADMIN_PATHS = ["/admin/login"];
const PUBLIC_ADMIN_API = ["/api/admin/auth/login", "/api/admin/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");

  // Allow the public auth entry points through.
  if (PUBLIC_ADMIN_PATHS.includes(pathname) || PUBLIC_ADMIN_API.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAdmin = session?.role === "admin";

  if (isAdmin) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { error: "Unauthorized: admin access required." },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
