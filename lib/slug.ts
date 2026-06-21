import type { Model } from "mongoose";
import { slugify } from "./utils";

/**
 * Generate a URL-safe slug from `title` that is unique within `Model`'s
 * `slug` field. If the base slug is taken, append `-2`, `-3`, … until a free
 * one is found. Pass `excludeId` when updating so a document doesn't collide
 * with itself.
 */
export async function generateUniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: Model<any>,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title) || "item";
  let candidate = base;
  let suffix = 2;

  // Loop until no other document owns the candidate slug.
  // Worst case is bounded by the number of existing collisions.
  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const clash = await Model.exists(query);
    if (!clash) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
