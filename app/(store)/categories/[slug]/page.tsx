import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import { queryPublishedProducts } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";
import ProductFilters from "@/components/store/ProductFilters";
import Pagination from "@/components/store/Pagination";

export const dynamic = "force-dynamic";

type SearchParams = { sort?: string; min?: string; max?: string; page?: string };

async function findCategory(slug: string) {
  await dbConnect();
  return Category.findOne({ slug }).lean<{ _id: unknown; name: string; slug: string } | null>();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await findCategory(params.slug);
  if (!category) return { title: "Category not found · Giftopia" };
  return {
    title: `${category.name} · Giftopia`,
    description: `Shop ${category.name} gifts at Giftopia.`,
  };
}

/** Products filtered to a single category, with sort/price filters. */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const category = await findCategory(params.slug);
  if (!category) notFound();

  const result = await queryPublishedProducts({
    categorySlug: params.slug,
    sort: searchParams.sort,
    min: searchParams.min ? Math.round(Number(searchParams.min) * 100) : undefined,
    max: searchParams.max ? Math.round(Number(searchParams.max) * 100) : undefined,
    page: Number(searchParams.page) || 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-ink">{category.name}</h1>
        <p className="mt-1 text-sm text-taupe">
          {result.total} {result.total === 1 ? "product" : "products"}
        </p>
      </header>

      <div className="mb-8">
        <ProductFilters categories={[]} showCategory={false} />
      </div>

      {result.products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center text-taupe">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination
        basePath={`/categories/${params.slug}`}
        query={{ sort: searchParams.sort, min: searchParams.min, max: searchParams.max }}
        page={result.page}
        pages={result.pages}
      />
    </div>
  );
}
