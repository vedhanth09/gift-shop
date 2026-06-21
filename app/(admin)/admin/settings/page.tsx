import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import AdminShell from "@/components/admin/AdminShell";
import SettingsForm from "@/components/admin/SettingsForm";
import AdminPasswordForm from "@/components/admin/AdminPasswordForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await dbConnect();
  const [settings, admin] = await Promise.all([
    getSettings(),
    User.findById(session.id).select("name email").lean<{
      name?: string;
      email?: string;
    } | null>(),
  ]);

  return (
    <AdminShell title="Settings">
      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
            Store
          </h2>
          <SettingsForm settings={settings} />
        </section>

        <section className="max-w-xl">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-taupe">
            Admin profile
          </h2>
          <p className="mb-3 text-sm text-taupe">
            Signed in as{" "}
            <span className="font-medium text-ink">
              {admin?.name || "Admin"}
            </span>{" "}
            ({admin?.email || "—"})
          </p>
          <AdminPasswordForm />
        </section>
      </div>
    </AdminShell>
  );
}
