import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import AdminShell from "@/components/admin/AdminShell";
import { LOW_STOCK_THRESHOLD } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * Inventory alerts (PRD §Phase 5): every published-or-not product at or below
 * the low-stock threshold, so the admin can restock before items sell out.
 * The threshold defaults to 5 and can be overridden with `?threshold=`.
 */
export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: { threshold?: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const parsed = Math.floor(Number(searchParams.threshold));
  const threshold =
    Number.isFinite(parsed) && parsed >= 0 ? parsed : LOW_STOCK_THRESHOLD;

  await dbConnect();
  const docs = await Product.find({ stock: { $lte: threshold } })
    .sort({ stock: 1, title: 1 })
    .select("title slug stock published")
    .populate("category", "name")
    .lean<
      {
        _id: unknown;
        title: string;
        stock: number;
        published: boolean;
        category?: { name?: string } | null;
      }[]
    >();

  const outOfStock = docs.filter((d) => d.stock <= 0);
  const lowStock = docs.filter((d) => d.stock > 0);

  return (
    <AdminShell title="Inventory alerts">
      <form className="mb-6 flex items-center gap-2 text-sm" action="/admin/inventory">
        <label htmlFor="threshold" className="text-taupe">
          Alert when stock is at or below
        </label>
        <input
          id="threshold"
          name="threshold"
          type="number"
          min="0"
          defaultValue={threshold}
          className="w-20 rounded-lg border border-line bg-surface px-2 py-1 placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
        />
        <button
          type="submit"
          className="rounded-lg bg-midnight px-3 py-1.5 font-semibold text-sand transition hover:bg-midnight-hover"
        >
          Apply
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Out of stock" value={outOfStock.length} tone="red" />
        <SummaryCard label="Low stock" value={lowStock.length} tone="amber" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line-subtle bg-surface">
        {docs.length === 0 ? (
          <p className="p-8 text-center text-sm text-taupe">
            Everything is well stocked — no products at or below {threshold} units.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line-subtle bg-sand-deep text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {docs.map((p) => (
                <tr key={String(p._id)} className="hover:bg-sand-deep/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${String(p._id)}`}
                      className="font-medium text-ink hover:text-midnight"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-taupe">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-taupe">
                    {p.published ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.stock <= 0
                          ? "bg-bad-bg text-bad-fg"
                          : "bg-warn-bg text-warn-fg"
                      }`}
                    >
                      {p.stock} left
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber";
}) {
  return (
    <div className="rounded-xl border border-line-subtle bg-surface p-5">
      <p className="text-sm text-taupe">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "red" ? "text-bad" : "text-warn"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
