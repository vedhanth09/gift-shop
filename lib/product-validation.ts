import mongoose from "mongoose";
import Category from "@/models/Category";

/**
 * Shared validation/normalisation for product create + update payloads.
 * Kept out of the route files so both `POST /products` and `PUT /products/[id]`
 * import it (route modules may only export HTTP handlers + segment config).
 *
 * Prices are integer paise (PRD §7); the admin form converts from rupees.
 */
export interface ProductBody {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  comparePrice?: unknown;
  category?: unknown;
  stock?: unknown;
  images?: unknown;
  tags?: unknown;
  published?: unknown;
}

export type ParseResult =
  | { data: Record<string, unknown> }
  | { error: string };

/**
 * Validate an incoming product payload. `partial` allows missing fields (for
 * PUT updates); on create, title/price/category are required. Returns either a
 * clean field object or an error string.
 */
export async function parseProductBody(
  body: ProductBody,
  partial: boolean
): Promise<ParseResult> {
  const out: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "Title is required." };
    }
    out.title = body.title.trim();
  } else if (!partial) {
    return { error: "Title is required." };
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Price must be a non-negative number (in paise)." };
    }
    out.price = Math.round(price);
  } else if (!partial) {
    return { error: "Price is required." };
  }

  if (
    body.comparePrice !== undefined &&
    body.comparePrice !== null &&
    body.comparePrice !== ""
  ) {
    const cp = Number(body.comparePrice);
    if (!Number.isFinite(cp) || cp < 0) {
      return { error: "Compare-at price must be a non-negative number." };
    }
    out.comparePrice = Math.round(cp);
  } else if (body.comparePrice === null || body.comparePrice === "") {
    // Explicitly clearing the compare-at price.
    out.comparePrice = undefined;
  }

  if (body.category !== undefined) {
    const category = String(body.category);
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return { error: "A valid category is required." };
    }
    const exists = await Category.exists({ _id: category });
    if (!exists) return { error: "Selected category does not exist." };
    out.category = category;
  } else if (!partial) {
    return { error: "A category is required." };
  }

  if (body.description !== undefined) {
    out.description =
      typeof body.description === "string" ? body.description : "";
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "Stock must be a non-negative whole number." };
    }
    out.stock = stock;
  }

  if (body.images !== undefined) {
    if (
      !Array.isArray(body.images) ||
      !body.images.every((u) => typeof u === "string")
    ) {
      return { error: "Images must be a list of URLs." };
    }
    if (body.images.length > 6) {
      return { error: "A product can have at most 6 images." };
    }
    out.images = body.images;
  }

  if (body.tags !== undefined) {
    if (
      !Array.isArray(body.tags) ||
      !body.tags.every((t) => typeof t === "string")
    ) {
      return { error: "Tags must be a list of strings." };
    }
    out.tags = (body.tags as string[]).map((t) => t.trim()).filter(Boolean);
  }

  if (body.published !== undefined) {
    out.published = Boolean(body.published);
  }

  return { data: out };
}
