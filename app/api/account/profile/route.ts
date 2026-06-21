import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";

export const runtime = "nodejs";

/**
 * PATCH /api/account/profile
 * Update the signed-in customer's name and/or email. Email must stay unique.
 *
 * Body: { name?, email? }
 */
export async function PATCH(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  let body: { name?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const name = sanitizeText(body.name);
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

  if (!name) return apiError("Name is required.", 400);
  if (!email || !isValidEmail(email)) {
    return apiError("A valid email is required.", 400);
  }

  await dbConnect();

  const clash = await User.findOne({ email, _id: { $ne: session.id } })
    .select("_id")
    .lean();
  if (clash) return apiError("That email is already in use.", 409);

  const user = await User.findByIdAndUpdate(
    session.id,
    { $set: { name, email } },
    { new: true }
  ).select("name email role");
  if (!user) return apiError("Account not found.", 404);

  return NextResponse.json({
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
  });
}
