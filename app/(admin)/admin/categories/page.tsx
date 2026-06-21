import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import AdminShell from "@/components/admin/AdminShell";
import CategoryManager, {
  type CategoryRow,
} from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();
  const docs = await Category.find().sort({ name: 1 }).lean();
  const categories: CategoryRow[] = docs.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
  }));

  return (
    <AdminShell title="Categories">
      <CategoryManager categories={categories} />
    </AdminShell>
  );
}
