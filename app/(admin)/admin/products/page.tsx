import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import AdminShell from "@/components/admin/AdminShell";
import ProductsTable, { type ProductRow } from "@/components/admin/ProductsTable";

export const dynamic = "force-dynamic";

interface PopulatedCategory {
  name?: string;
}

export default async function AdminProductsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();
  const docs = await Product.find()
    .sort({ createdAt: -1 })
    .populate("category", "name")
    .lean();

  const products: ProductRow[] = docs.map((p) => ({
    id: String(p._id),
    title: p.title,
    price: p.price,
    stock: p.stock,
    published: p.published,
    thumbnail: p.images?.[0] ?? null,
    categoryName: (p.category as PopulatedCategory | null)?.name ?? "—",
  }));

  return (
    <AdminShell
      title="Products"
      actions={
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover"
        >
          + New product
        </Link>
      }
    >
      <ProductsTable products={products} />
    </AdminShell>
  );
}
