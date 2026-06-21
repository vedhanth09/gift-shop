import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyPassword } from "@/lib/password";
import {
  signToken,
  cookieOptions,
  CUSTOMER_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  CUSTOMER_TOKEN_TTL,
  CUSTOMER_REFRESH_TTL,
} from "@/lib/auth";
import { isValidEmail } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; remember?: boolean };
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

  const user = await User.findOne({ email, role: "customer" }).select("+password");
  const ok = user ? await verifyPassword(password, user.password) : false;

  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  // "Remember me" extends the access cookie to the full 7-day token life;
  // otherwise it becomes a session cookie (maxAge omitted).
  const remember = body.remember === true;

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

  const accessOpts = cookieOptions(CUSTOMER_TOKEN_TTL);
  if (!remember) delete (accessOpts as { maxAge?: number }).maxAge;

  res.cookies.set(CUSTOMER_COOKIE, token, accessOpts);
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, refresh, cookieOptions(CUSTOMER_REFRESH_TTL));
  return res;
}
