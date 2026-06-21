import { redirect, notFound } from "next/navigation";
import mongoose from "mongoose";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm, {
  type CategoryOption,
  type ProductFormData,
} from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (!mongoose.Types.ObjectId.isValid(params.id)) notFound();

  await dbConnect();
  const [doc, cats] = await Promise.all([
    Product.findById(params.id).lean(),
    Category.find().sort({ name: 1 }).lean(),
  ]);

  if (!doc) notFound();

  const product: ProductFormData = {
    id: String(doc._id),
    title: doc.title,
    description: doc.description ?? "",
    price: doc.price,
    comparePrice: doc.comparePrice,
    category: String(doc.category),
    stock: doc.stock,
    images: doc.images ?? [],
    tags: doc.tags ?? [],
    published: doc.published,
  };

  const categories: CategoryOption[] = cats.map((c) => ({
    id: String(c._id),
    name: c.name,
  }));

  return (
    <AdminShell title="Edit product">
      <ProductForm categories={categories} product={product} />
    </AdminShell>
  );
}
