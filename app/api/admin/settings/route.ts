import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings from "@/models/Settings";
import { requireAdmin, apiError } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { rupeesToPaise, isValidEmail } from "@/lib/utils";

export const runtime = "nodejs";

/** GET /api/admin/settings — current store settings (money in paise). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const settings = await getSettings();
  return NextResponse.json({ settings });
}

/**
 * PUT /api/admin/settings — upsert the singleton store settings.
 * Money fields (shipping) arrive in rupees and are stored as paise (PRD §7).
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const rupees = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? rupeesToPaise(n) : 0;
  };

  const contactEmail = str(body.contactEmail);
  if (contactEmail && !isValidEmail(contactEmail)) {
    return apiError("Enter a valid contact email.", 400);
  }

  const social = (body.social ?? {}) as Record<string, unknown>;

  const update = {
    storeName: str(body.storeName) || "Giftopia",
    logoUrl: str(body.logoUrl),
    contactEmail,
    currency: str(body.currency) || "INR",
    shippingFee: rupees(body.shippingFee),
    freeShippingThreshold: rupees(body.freeShippingThreshold),
    social: {
      instagram: str(social.instagram),
      twitter: str(social.twitter),
      facebook: str(social.facebook),
    },
  };

  await dbConnect();
  await Settings.findOneAndUpdate(
    { key: "store" },
    { $set: update },
    { upsert: true, new: true }
  );

  return NextResponse.json({ settings: await getSettings() });
}
