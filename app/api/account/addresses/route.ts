import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import User, { type IAddress } from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import { apiError } from "@/lib/api";
import { sanitizeText } from "@/lib/sanitize";

export const runtime = "nodejs";

const MAX_ADDRESSES = 5;
const FIELDS: (keyof Omit<IAddress, "isDefault">)[] = [
  "label",
  "line1",
  "city",
  "state",
  "pincode",
  "phone",
];

/** Coerce the request payload into clean, validated addresses (PRD: max 5). */
function parseAddresses(raw: unknown): IAddress[] | { error: string } {
  if (!Array.isArray(raw)) return { error: "Addresses must be a list." };
  if (raw.length > MAX_ADDRESSES) {
    return { error: `You can save at most ${MAX_ADDRESSES} addresses.` };
  }

  const out: IAddress[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { error: "Each address must be complete." };
    }
    const src = item as Record<string, unknown>;
    const addr = { isDefault: Boolean(src.isDefault) } as IAddress;
    for (const field of FIELDS) {
      const value = sanitizeText(src[field]);
      if (!value) return { error: "Please complete every address field." };
      addr[field] = value;
    }
    out.push(addr);
  }

  // Exactly one default when there is at least one address.
  let seenDefault = false;
  for (const addr of out) {
    if (addr.isDefault && !seenDefault) {
      seenDefault = true;
    } else {
      addr.isDefault = false;
    }
  }
  if (!seenDefault && out.length > 0) out[0].isDefault = true;

  return out;
}

/** GET /api/account/addresses — the customer's saved addresses. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  await dbConnect();
  const user = await User.findById(session.id)
    .select("addresses")
    .lean<{ addresses?: IAddress[] } | null>();

  return NextResponse.json({ addresses: user?.addresses ?? [] });
}

/**
 * PUT /api/account/addresses — replace the saved address list (max 5).
 * Body: { addresses: [{ label, line1, city, state, pincode, phone, isDefault }] }
 */
export async function PUT(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return apiError("Unauthorized.", 401);

  let body: { addresses?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = parseAddresses(body.addresses);
  if ("error" in parsed) return apiError(parsed.error, 400);

  await dbConnect();
  await User.findByIdAndUpdate(session.id, { $set: { addresses: parsed } });

  return NextResponse.json({ addresses: parsed });
}
