import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User, { type IAddress } from "@/models/User";
import { getCustomerSession } from "@/lib/session";
import AccountSettings from "@/components/store/AccountSettings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account settings · Giftly",
};

export default async function AccountSettingsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?from=/account/settings");

  await dbConnect();
  const user = await User.findById(session.id)
    .select("name email addresses")
    .lean<{ name: string; email: string; addresses?: IAddress[] } | null>();

  if (!user) redirect("/account/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink">Account settings</h1>
      <AccountSettings
        name={user.name}
        email={user.email}
        addresses={(user.addresses ?? []).map((a) => ({
          label: a.label,
          line1: a.line1,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          phone: a.phone,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
