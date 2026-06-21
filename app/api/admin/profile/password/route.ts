import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { requireAdmin, apiError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

/**
 * POST /api/admin/profile/password
 * Change the signed-in admin's password (PRD §Phase 5 admin profile). Requires
 * the current password and re-uses the bcrypt helpers (12 rounds).
 *
 * Body: { currentPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return apiError("Current and new passwords are required.", 400);
  }
  if (newPassword.length < 8) {
    return apiError("New password must be at least 8 characters.", 400);
  }

  await dbConnect();
  const user = await User.findById(auth.id).select("+password");
  if (!user || user.role !== "admin") {
    return apiError("Admin account not found.", 404);
  }

  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) return apiError("Your current password is incorrect.", 400);

  user.password = await hashPassword(newPassword);
  await user.save();

  return NextResponse.json({ ok: true });
}
