import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE, CUSTOMER_REFRESH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clear = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(CUSTOMER_COOKIE, "", clear);
  res.cookies.set(CUSTOMER_REFRESH_COOKIE, "", clear);
  return res;
}
