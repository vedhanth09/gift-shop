import { NextResponse } from "next/server";
import { getAdminSession } from "./session";
import type { SessionPayload } from "./auth";

/**
 * Shared helpers for admin route handlers. Middleware already gates
 * `/api/admin/*`, but every handler re-checks the session server-side
 * (PRD §9: "role check on every admin API handler"). Routes outside the
 * `/api/admin` matcher (e.g. uploads) rely on this check entirely.
 */

/** JSON error response shorthand. */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Resolve the admin session, or return a 401 response to send back. Use as:
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is the SessionPayload here
 */
export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getAdminSession();
  if (!session) return apiError("Unauthorized: admin access required.", 401);
  return session;
}
