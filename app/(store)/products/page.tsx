import type { Metadata } from "next";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import { queryPublishedProducts } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";
import ProductFilters from "@/components/store/ProductFilters";
import Pagination from "@/components/store/Pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all gifts · Giftopia",
  description: "Browse the full Giftopia catalogue of curated gifts.",
};

type SearchParams = {
  category?: string;
  sort?: string;
  q?: string;
  min?: string;
  max?: string;
  page?: string;
};

/** Product listing with category/price filters, sorting and pagination. */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await dbConnect();

  const [result, categoryDocs] = await Promise.all([
    queryPublishedProducts({
      categorySlug: searchParams.category,
      sort: searchParams.sort,
      q: searchParams.q,
      min: searchParams.min ? Math.round(Number(searchParams.min) * 100) : undefined,
      max: searchParams.max ? Math.round(Number(searchParams.max) * 100) : undefined,
      page: Number(searchParams.page) || 1,
    }),
    Category.find().sort({ name: 1 }).lean(),
  ]);

  const categories = categoryDocs.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-ink">Shop all gifts</h1>
        <p className="mt-1 text-sm text-taupe">
          {result.total} {result.total === 1 ? "product" : "products"}
        </p>
      </header>

      <div className="mb-8">
        <ProductFilters categories={categories} />
      </div>

      {result.products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center text-taupe">
          No products match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/products"
        query={{
          category: searchParams.category,
          sort: searchParams.sort,
          q: searchParams.q,
          min: searchParams.min,
          max: searchParams.max,
        }}
        page={result.page}
        pages={result.pages}
      />
    </div>
  );
}
