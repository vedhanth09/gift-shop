import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { apiError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset-password  Body: { token, password }
 * Complete a password reset. The raw token from the email is hashed and matched
 * against the stored, unexpired hash; on success the password is replaced and
 * the token is cleared (single-use). Verifying the email is implied — only the
 * inbox owner could have received the link — so the account is marked verified.
 */
export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) return apiError("A reset token is required.", 400);
  if (password.length < 8) {
    return apiError("Password must be at least 8 characters.", 400);
  }

  await dbConnect();

  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
  }).select("+resetTokenHash +resetTokenExpires");

  if (!user) {
    return apiError("This reset link is invalid or has expired.", 400);
  }

  user.password = await hashPassword(password);
  user.emailVerified = true; // reaching the inbox proves ownership
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  return NextResponse.json({ ok: true });
}
