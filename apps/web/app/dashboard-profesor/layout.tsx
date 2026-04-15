"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Viewer = {
  name: string;
  email: string;
};

const navItems = [
  { href: "/dashboard-profesor", label: "General" },
  { href: "/dashboard-profesor/gestionare-cursuri", label: "Gestionare cursuri" },
  { href: "/dashboard-profesor/prieteni", label: "Prieteni" },
  { href: "/dashboard-profesor/contul-meu", label: "Contul meu" },
] as const;

export default function InstructorDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [viewer, setViewer] = useState<Viewer>({ name: "Profesor", email: "-" });

  useEffect(() => {
    const hasInstructorTwoFactorCookie = () => {
      if (typeof document === "undefined") {
        return false;
      }

      return document.cookie
        .split(";")
        .map((chunk) => chunk.trim())
        .some((chunk) => chunk.startsWith("devatlas_instructor_2fa_verified="));
    };

    const checkRole = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        const role = String(session?.user?.user_metadata?.role ?? "").toUpperCase();

        if (!session) {
          router.replace("/auth/signin?next=/dashboard-profesor");
          return;
        }

        if (role === "ADMIN") {
          router.replace("/dashboad-administrator");
          return;
        }

        if (role !== "INSTRUCTOR") {
          router.replace("/dashboard-elev");
          return;
        }

        if (!hasInstructorTwoFactorCookie()) {
          router.replace("/auth/signin?next=/dashboard-profesor");
          return;
        }

        setViewer({
          name: String(session.user.user_metadata?.full_name ?? "Profesor"),
          email: String(session.user.email ?? "-"),
        });
      } finally {
        setChecking(false);
      }
    };

    void checkRole();
  }, [router]);

  const initial = useMemo(() => (viewer.name.trim().charAt(0) || "P").toUpperCase(), [viewer.name]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-gray-300">
        Verific sesiunea profesorului...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.07),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/15 to-transparent opacity-60" />

      <div className="relative w-full px-0 pb-8 pt-0">
        <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/85 px-3 py-3 shadow-[0_8px_30px_rgba(6,182,212,0.08)] backdrop-blur-sm sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black shadow-sm">
              <Image src="/logos/Alb.png" alt="DevAtlas" width={40} height={40} className="h-full w-full object-contain p-1" />
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${active ? "border-cyan-300/60 bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.25)]" : "border-white/20 bg-white/5 text-gray-200 hover:border-cyan-300/40 hover:bg-cyan-400/10"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-2 py-1.5 shadow-[0_4px_16px_rgba(6,182,212,0.08)]">
              <div className="text-right">
                <p className="max-w-[160px] truncate text-xs font-semibold text-white">{viewer.name}</p>
                <p className="max-w-[160px] truncate text-[10px] text-gray-300">{viewer.email}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-black">{initial}</div>
            </div>
          </div>
        </header>

        <div className="w-full px-3 pt-24 sm:px-4 lg:px-6">{children}</div>
      </div>
    </main>
  );
}
