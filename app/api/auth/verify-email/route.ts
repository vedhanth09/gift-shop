import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { apiError } from "@/lib/api";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * POST /api/auth/verify-email  Body: { token }
 * Confirm a customer's email from the link mailed at registration. The raw
 * token is hashed and matched against the stored hash (single-use, time-boxed).
 * Already-verified accounts return ok so re-clicking the link is harmless.
 */
export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return apiError("A verification token is required.", 400);

  await dbConnect();

  const user = await User.findOne({
    verifyTokenHash: hashToken(token),
    verifyTokenExpires: { $gt: new Date() },
  }).select("+verifyTokenHash +verifyTokenExpires");

  if (!user) {
    return apiError("This verification link is invalid or has expired.", 400);
  }

  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();

  return NextResponse.json({ ok: true });
}
