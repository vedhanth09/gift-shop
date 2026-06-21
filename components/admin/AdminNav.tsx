"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

/** Dark admin sidebar — Seal mark, vertical nav, logout pinned to the bottom. */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-4 bg-ink px-3 py-4 lg:min-h-screen lg:w-[248px] lg:shrink-0">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-2.5 px-2 py-1"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight font-display text-sm font-semibold text-camel"
          style={{ boxShadow: "inset 0 0 0 1.25px #B58A4A" }}
          aria-hidden
        >
          G
        </span>
        <span className="font-display text-lg font-semibold text-sand">
          Giftly <span className="text-camel">Admin</span>
        </span>
      </Link>

      <nav
        className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        aria-label="Admin"
      >
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-camel/[0.16] text-camel lg:border-l-2 lg:border-camel"
                  : "text-[#C9C2B0] hover:bg-white/5 hover:text-sand"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
