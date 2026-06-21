import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm, { type CategoryOption } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();
  const cats = await Category.find().sort({ name: 1 }).lean();
  const categories: CategoryOption[] = cats.map((c) => ({
    id: String(c._id),
    name: c.name,
  }));

  return (
    <AdminShell title="New product">
      <ProductForm categories={categories} />
    </AdminShell>
  );
}
