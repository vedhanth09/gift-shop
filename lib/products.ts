import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";

/**
 * Public-facing product helpers shared by the storefront pages and the
 * `/api/products` routes, so list/detail queries stay consistent (only
 * published products, the same sort options, the same serialised shape).
 *
 * Prices are integer paise (PRD §7); the UI formats them with `formatINR`.
 */

export const PAGE_SIZE = 12;
export const LOW_STOCK_THRESHOLD = 5;

export type ProductSort = "newest" | "price-asc" | "price-desc";

export interface PublicCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number; // paise
  comparePrice: number | null;
  images: string[];
  stock: number;
  inStock: boolean;
  category: PublicCategoryRef | null;
  tags: string[];
}

export interface ProductQueryParams {
  categorySlug?: string;
  sort?: string;
  q?: string;
  min?: number; // paise
  max?: number; // paise
  page?: number;
}

export interface ProductListResult {
  products: PublicProduct[];
  total: number;
  page: number;
  pages: number;
}

const SORT_MAP: Record<ProductSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
};

/** Normalise an arbitrary `?sort=` value to a supported option. */
export function normalizeSort(value?: string | null): ProductSort {
  if (value === "price-asc" || value === "price-desc") return value;
  return "newest";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Map a (possibly populated) lean Product document to the public shape. */
export function serializeProduct(doc: any): PublicProduct {
  const cat = doc.category;
  const category: PublicCategoryRef | null =
    cat && typeof cat === "object" && "name" in cat
      ? { id: String(cat._id), name: cat.name, slug: cat.slug }
      : null;

  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description ?? "",
    price: doc.price,
    comparePrice: doc.comparePrice ?? null,
    images: Array.isArray(doc.images) ? doc.images : [],
    stock: doc.stock ?? 0,
    inStock: (doc.stock ?? 0) > 0,
    category,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Query published products with optional category/search/price filters,
 * sorting and pagination. Resolving the category slug to an id (and returning
 * an empty page when it doesn't exist) keeps callers from needing the model.
 */
export async function queryPublishedProducts(
  params: ProductQueryParams
): Promise<ProductListResult> {
  await dbConnect();

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const sort = normalizeSort(params.sort);

  const filter: Record<string, unknown> = { published: true };

  if (params.categorySlug) {
    const category = await Category.findOne({ slug: params.categorySlug })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    if (!category) {
      return { products: [], total: 0, page, pages: 0 };
    }
    filter.category = category._id;
  }

  if (params.q) {
    const rx = { $regex: escapeRegex(params.q), $options: "i" };
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  if (params.min !== undefined || params.max !== undefined) {
    const price: Record<string, number> = {};
    if (params.min !== undefined) price.$gte = params.min;
    if (params.max !== undefined) price.$lte = params.max;
    filter.price = price;
  }

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_MAP[sort])
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate("category", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: docs.map(serializeProduct),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
}

/** Fetch a single published product by slug, or null if missing/unpublished. */
export async function getPublishedProductBySlug(
  slug: string
): Promise<PublicProduct | null> {
  await dbConnect();
  const doc = await Product.findOne({ slug, published: true })
    .populate("category", "name slug")
    .lean();
  return doc ? serializeProduct(doc) : null;
}

/** Up to `limit` other published products in the same category. */
export async function getRelatedProducts(
  product: PublicProduct,
  limit = 4
): Promise<PublicProduct[]> {
  if (!product.category) return [];
  await dbConnect();
  const docs = await Product.find({
    published: true,
    category: product.category.id,
    _id: { $ne: product.id },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category", "name slug")
    .lean();
  return docs.map(serializeProduct);
}

/** Escape user input before using it inside a `$regex` query. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
