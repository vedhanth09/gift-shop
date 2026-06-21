import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyPassword } from "@/lib/password";
import {
  signToken,
  cookieOptions,
  ADMIN_COOKIE,
  ADMIN_TOKEN_TTL,
} from "@/lib/auth";
import {
  checkRateLimit,
  registerFailure,
  resetRateLimit,
} from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const limit = checkRateLimit(`admin-login:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(
          limit.retryAfterSeconds / 60
        )} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!email || !isValidEmail(email) || !password) {
    return NextResponse.json(
      { error: "Valid email and password are required." },
      { status: 400 }
    );
  }

  await dbConnect();

  // Only an admin account may authenticate here.
  const user = await User.findOne({ email, role: "admin" }).select("+password");

  const ok = user ? await verifyPassword(password, user.password) : false;

  if (!user || !ok) {
    registerFailure(`admin-login:${ip}`);
    // Generic message — do not reveal whether the email exists.
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  resetRateLimit(`admin-login:${ip}`);

  const token = await signToken(
    { id: String(user._id), role: "admin" },
    ADMIN_TOKEN_TTL
  );

  const res = NextResponse.json({
    ok: true,
    user: { id: String(user._id), name: user.name, email: user.email, role: "admin" },
  });
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TOKEN_TTL));
  return res;
}
