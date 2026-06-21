import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

/**
 * Cart validation shared by the cart page, the `/api/cart/validate` endpoint
 * and (later) order creation. The cart itself lives client-side, so prices,
 * stock and publish state are always re-checked against the database before
 * checkout — enforcing PRD §17.5 ("unpublished products show 'no longer
 * available', block checkout") and refreshing snapshot prices.
 */

export interface CartLineInput {
  productId: string;
  qty: number;
}

export interface ValidatedCartLine {
  productId: string;
  title: string;
  slug: string | null;
  image: string | null;
  price: number; // current price in paise
  qty: number; // requested quantity
  stock: number;
  available: boolean; // published and at least one in stock
  reason: string | null; // human-readable issue, or null when fine
}

export interface ValidatedCart {
  lines: ValidatedCartLine[];
  subtotal: number; // paise, available lines clamped to stock
  hasIssues: boolean; // any line needs the user's attention
  checkoutBlocked: boolean; // at least one line cannot be ordered
}

/** Coerce arbitrary request input into clean `{ productId, qty }` lines. */
export function parseCartInput(raw: unknown): CartLineInput[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartLineInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const productId = String((item as Record<string, unknown>).productId ?? "");
    const qty = Math.floor(Number((item as Record<string, unknown>).qty));
    if (!mongoose.Types.ObjectId.isValid(productId)) continue;
    if (!Number.isFinite(qty) || qty < 1) continue;
    lines.push({ productId, qty });
  }
  return lines;
}

/**
 * Re-check each cart line against the database. Unknown, unpublished or
 * out-of-stock products are marked unavailable; lines that exceed stock are
 * flagged. The subtotal counts only orderable quantity.
 */
export async function validateCart(
  input: CartLineInput[]
): Promise<ValidatedCart> {
  if (input.length === 0) {
    return { lines: [], subtotal: 0, hasIssues: false, checkoutBlocked: false };
  }

  await dbConnect();

  const ids = input.map((l) => l.productId);
  const docs = await Product.find({ _id: { $in: ids } })
    .select("title slug images price stock published")
    .lean();

  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const lines: ValidatedCartLine[] = input.map((line) => {
    const doc = byId.get(line.productId);

    if (!doc || !doc.published) {
      return {
        productId: line.productId,
        title: doc?.title ?? "Unavailable item",
        slug: doc?.slug ?? null,
        image: doc?.images?.[0] ?? null,
        price: doc?.price ?? 0,
        qty: line.qty,
        stock: 0,
        available: false,
        reason: "No longer available",
      };
    }

    const base = {
      productId: line.productId,
      title: doc.title,
      slug: doc.slug,
      image: doc.images?.[0] ?? null,
      price: doc.price,
      qty: line.qty,
      stock: doc.stock,
    };

    if (doc.stock <= 0) {
      return { ...base, available: false, reason: "Out of stock" };
    }
    if (line.qty > doc.stock) {
      return {
        ...base,
        available: true,
        reason: `Only ${doc.stock} in stock — quantity reduced`,
      };
    }
    return { ...base, available: true, reason: null };
  });

  const subtotal = lines.reduce(
    (sum, l) =>
      l.available ? sum + l.price * Math.min(l.qty, l.stock) : sum,
    0
  );

  const hasIssues = lines.some((l) => l.reason !== null);
  const checkoutBlocked =
    lines.length === 0 || lines.some((l) => !l.available);

  return { lines, subtotal, hasIssues, checkoutBlocked };
}
