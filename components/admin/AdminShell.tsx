import type { ReactNode } from "react";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";
import Toaster from "@/components/store/Toaster";

/**
 * Chrome shared by every protected admin page: a dark sidebar, a sand top bar
 * with the page title + admin actions, and the titled content area. Each page
 * still performs its own session check/redirect (the admin route group has no
 * shared layout because /admin/login lives in it too).
 */
export default function AdminShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-sand lg:flex-row">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-sand/90 px-6 py-4 backdrop-blur">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <div className="w-auto">
              <LogoutButton />
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-6 py-8"
        >
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
