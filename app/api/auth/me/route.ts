import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { getCustomerSession } from "@/lib/session";

export const runtime = "nodejs";

/** Returns the current customer profile, or null when unauthenticated. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  await dbConnect();
  const user = await User.findById(session.id).select("name email role emailVerified");
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
}
