import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";
import {
  signToken,
  cookieOptions,
  CUSTOMER_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  CUSTOMER_TOKEN_TTL,
  CUSTOMER_REFRESH_TTL,
} from "@/lib/auth";
import { isValidEmail } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import { issueToken, VERIFY_TOKEN_TTL_MS } from "@/lib/tokens";
import { isEmailConfigured, sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = sanitizeText(body.name);
  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!name || !email || !isValidEmail(email) || !password) {
    return NextResponse.json(
      { error: "Name, a valid email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  await dbConnect();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Email verification (V1.1). When email is configured the account starts
  // unverified and a verification link is sent; without email credentials there
  // is no way to verify, so the account is auto-verified to keep dev usable.
  const emailOn = isEmailConfigured();
  const verify = emailOn ? issueToken() : null;

  const user = await User.create({
    name,
    email,
    password: await hashPassword(password),
    role: "customer",
    emailVerified: !emailOn,
    verifyTokenHash: verify?.hash,
    verifyTokenExpires: verify
      ? new Date(Date.now() + VERIFY_TOKEN_TTL_MS)
      : undefined,
  });

  if (verify) {
    // Best-effort; never block sign-up on email delivery.
    void sendVerificationEmail({ to: email, name, token: verify.token });
  }

  const [token, refresh] = await Promise.all([
    signToken({ id: String(user._id), role: "customer" }, CUSTOMER_TOKEN_TTL),
    signToken({ id: String(user._id), role: "customer" }, CUSTOMER_REFRESH_TTL, true),
  ]);

  const res = NextResponse.json({
    ok: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "customer",
      emailVerified: user.emailVerified,
    },
  });
  res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions(CUSTOMER_TOKEN_TTL));
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, refresh, cookieOptions(CUSTOMER_REFRESH_TTL));
  return res;
}
