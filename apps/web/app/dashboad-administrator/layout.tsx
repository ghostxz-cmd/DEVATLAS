"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type LayoutProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboad-administrator", label: "Dashboard" },
  { href: "/dashboad-administrator/teachers", label: "Gestionare Profesori" },
  { href: "/dashboad-administrator/support", label: "Support" },
  { href: "/dashboad-administrator/courses", label: "Courses" },
  { href: "/dashboad-administrator/content", label: "Content" },
  { href: "/dashboad-administrator/audit-logs", label: "Audit Logs" },
  { href: "/dashboad-administrator/settings", label: "Settings" },
];

export default function AdministratorLayout({ children }: LayoutProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-[#202124]">
      <header className="sticky top-0 z-40 border-b border-[#e0e2e7] bg-white">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#5f6368] transition hover:bg-[#f1f3f4]"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1a73e8] text-xs font-bold text-white">DA</div>
            <span className="font-medium text-[#5f6368]">DevAtlas Admin</span>
          </div>

          <div className="mx-auto flex h-11 w-full max-w-3xl items-center rounded-lg border border-[#e0e2e7] bg-[#f8f9fa] px-3">
            <svg className="h-4 w-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
            <input
              type="text"
              readOnly
              placeholder="Search users, tickets, actions"
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-[#70757a]"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex h-10 items-center rounded-lg border border-[#e0e2e7] px-3 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl border border-[#e0e2e7] bg-white p-3">
          <button
            type="button"
            className="mb-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#d3e3fd] text-sm font-semibold text-[#174ea6]"
          >
            + Add Module
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 items-center rounded-lg px-3 text-sm transition ${
                    active ? "bg-[#1a73e8] text-white" : "text-[#3c4043] hover:bg-[#f1f3f4]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 rounded-2xl border border-[#e0e2e7] bg-white">{children}</section>
      </div>
    </div>
  );
}
