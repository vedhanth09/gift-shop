import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { apiError } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import { issueToken, RESET_TOKEN_TTL_MS } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, registerFailure } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Best-effort client IP for throttling. */
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/auth/forgot-password  Body: { email }
 * Starts a password reset. Always responds with the same success message
 * whether or not the email exists, so the endpoint can't be used to enumerate
 * accounts. A reset link is only emailed when a matching customer is found.
 * Throttled to 5 requests / 15 min per IP (reuses the login rate limiter).
 */
export async function POST(req: NextRequest) {
  const key = `forgot:${clientIp(req)}`;
  const rl = checkRateLimit(key);
  if (!rl.allowed) {
    return apiError(
      "Too many reset requests. Please try again later.",
      429
    );
  }
  registerFailure(key); // count this request toward the window

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email || !isValidEmail(email)) {
    return apiError("Please enter a valid email address.", 400);
  }

  await dbConnect();
  const user = await User.findOne({ email, role: "customer" }).select(
    "name email"
  );

  if (user) {
    const reset = issueToken();
    user.resetTokenHash = reset.hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    void sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: reset.token,
    });
  }

  // Identical response regardless of whether the account exists.
  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a password reset link is on its way.",
  });
}
