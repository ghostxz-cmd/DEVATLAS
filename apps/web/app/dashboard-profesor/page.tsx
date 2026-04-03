"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("Profesor");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const role = String(data.session?.user?.user_metadata?.role ?? "").toUpperCase();

        if (!data.session) {
          router.replace("/auth/signin");
          return;
        }

        if (role === "ADMIN") {
          router.replace("/dashboad-administrator");
          return;
        }

        if (role !== "INSTRUCTOR") {
          router.replace("/auth/elevi/signin");
          return;
        }

        setName(String(data.session.user.user_metadata?.full_name ?? "Profesor"));
      } finally {
        setChecking(false);
      }
    };

    void checkAuth();
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <p className="text-sm text-[#5f6368]">Checking instructor session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] p-6">
      <section className="mx-auto max-w-5xl rounded-2xl border border-[#e0e2e7] bg-white p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[#5f6368]">Instructor dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#202124]">Bine ai venit, {name}</h1>
        <p className="mt-2 text-sm text-[#5f6368]">Aceasta este secțiunea separată pentru profesori.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
            <p className="text-xs text-[#5f6368]">Cursuri</p>
            <p className="mt-2 text-lg font-semibold text-[#202124]">Gestionare</p>
          </div>
          <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
            <p className="text-xs text-[#5f6368]">Conținut</p>
            <p className="mt-2 text-lg font-semibold text-[#202124]">Lecții și materiale</p>
          </div>
          <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
            <p className="text-xs text-[#5f6368]">Activitate</p>
            <p className="mt-2 text-lg font-semibold text-[#202124]">Audit personal</p>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/cursuri" className="inline-flex h-10 items-center rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white">
            Vezi cursurile publice
          </Link>
        </div>
      </section>
    </main>
  );
}