"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StudentSessionPayload = {
  authenticated: boolean;
  student?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

const navItems = [
  { href: "/dashboard-elev", label: "General" },
  { href: "/dashboard-elev/cursuri", label: "Cursuri" },
  { href: "/dashboard-elev/prieteni", label: "Prieteni" },
  { href: "/dashboard-elev/contul-meu", label: "Contul meu" },
] as const;

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Elev");
  const [email, setEmail] = useState("-");

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/students/session", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as StudentSessionPayload;
      if (payload.student?.fullName) {
        setName(payload.student.fullName);
      }
      if (payload.student?.email) {
        setEmail(payload.student.email);
      }
    };

    void loadSession();
  }, []);

  const initial = useMemo(() => (name.trim().charAt(0) || "E").toUpperCase(), [name]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white text-[#0f172a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.07),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#eff6ff] to-transparent opacity-60" />

      <div className="relative w-full px-0 pb-8 pt-0">
        <header className="fixed left-0 top-0 z-50 w-full border-b border-[#e5e7eb] bg-white/95 px-3 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f172a] text-sm font-black text-white shadow-sm">✹</div>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${active ? "border-[#111827] bg-[#111827] text-white shadow-sm" : "border-[#d4d9e5] bg-white text-[#334155] hover:bg-[#f8fafc]"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex min-w-[180px] items-center rounded-full border border-[#d4d9e5] bg-white px-3 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
              <input
                type="text"
                placeholder="Search by category"
                className="w-full bg-transparent text-xs text-[#334155] outline-none placeholder:text-[#94a3b8] sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#d4d9e5] bg-white px-2 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
              <div className="text-right">
                <p className="max-w-[120px] truncate text-xs font-semibold text-[#0f172a]">{name}</p>
                <p className="max-w-[120px] truncate text-[10px] text-[#64748b]">{email}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f172a] text-xs font-black text-white">{initial}</div>
            </div>
          </div>
        </header>

        <div className="w-full px-3 pt-24 sm:px-4 lg:px-6">{children}</div>
      </div>
    </main>
  );
}
