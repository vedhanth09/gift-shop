import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import "@/models/Category"; // register schema for populate()
import { getCustomerSession } from "@/lib/session";
import { serializeProduct, type PublicProduct } from "@/lib/products";
import WishlistView from "@/components/store/WishlistView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My wishlist · Giftly",
};

export default async function WishlistPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?from=/account/wishlist");

  await dbConnect();
  const user = await User.findById(session.id)
    .select("wishlist")
    .lean<{ wishlist?: unknown[] } | null>();

  const ids = (user?.wishlist ?? []).map(String);
  let items: PublicProduct[] = [];
  if (ids.length > 0) {
    const docs = await Product.find({ _id: { $in: ids }, published: true })
      .populate("category", "name slug")
      .lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    items = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((d) => serializeProduct(d));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">My wishlist</h1>
        <Link
          href="/account/orders"
          className="text-sm font-medium text-midnight hover:underline"
        >
          My orders →
        </Link>
      </div>
      <WishlistView items={items} />
    </div>
  );
}
