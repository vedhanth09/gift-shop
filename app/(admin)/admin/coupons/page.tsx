import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import Coupon from "@/models/Coupon";
import AdminShell from "@/components/admin/AdminShell";
import CouponManager from "@/components/admin/CouponManager";
import { serializeCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();
  const docs = await Coupon.find().sort({ _id: -1 }).lean();
  const coupons = docs.map(serializeCoupon);

  return (
    <AdminShell title="Coupons">
      <CouponManager coupons={coupons} />
    </AdminShell>
  );
}
