import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { issueToken, VERIFY_TOKEN_TTL_MS } from "@/lib/tokens";
import { isEmailConfigured, sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/auth/resend-verification
 * Re-send the verification email to the signed-in customer (new token). When
 * email isn't configured there's no way to deliver a link, so the account is
 * marked verified instead — keeping the flow usable in development.
 */
export async function POST() {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  await dbConnect();
  const user = await User.findById(session.id).select("name email emailVerified");
  if (!user) return apiError("Account not found.", 404);

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (!isEmailConfigured()) {
    user.emailVerified = true;
    await user.save();
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verify = issueToken();
  user.verifyTokenHash = verify.hash;
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  await user.save();

  void sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verify.token,
  });

  return NextResponse.json({ ok: true });
}
