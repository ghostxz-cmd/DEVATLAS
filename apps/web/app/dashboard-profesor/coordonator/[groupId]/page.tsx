"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type GroupDetailResponse = {
  group: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    kind: "FOLDER" | "MODULE";
    coverImageUrl: string | null;
    levelRequired: string | null;
    visibility: string;
    owner: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
      timezone: string | null;
    };
    coordinator: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
      timezone: string | null;
    } | null;
    attachments: unknown;
    metadata: unknown;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    courseCount: number;
    publishedCourseCount: number;
    draftCourseCount: number;
    members: Array<{
      id: string;
      instructorId: string;
      fullName: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      timezone: string | null;
    }>;
    courses: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      level: string;
      visibility: string;
      estimatedMins: number | null;
      requiredLevel: string | null;
      createdBy: string;
      publishedAt: string | null;
      createdAt: string;
    }>;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function InstructorCoordinatorDashboardPage({ params }: { params: { groupId: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GroupDetailResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          throw new Error("Nu există o sesiune activă de profesor.");
        }

        const response = await fetch(`/api/dashboard/instructor/course-groups/${params.groupId}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca dashboard-ul coordonatorului.");
        }

        setData((await response.json()) as GroupDetailResponse);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca dashboard-ul coordonatorului.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params]);

  const group = data?.group;
  const cards = useMemo(
    () => [
      { label: "Cursuri", value: group?.courseCount ?? 0, hint: "în modul" },
      { label: "Publicate", value: group?.publishedCourseCount ?? 0, hint: "active" },
      { label: "Drafturi", value: group?.draftCourseCount ?? 0, hint: "în lucru" },
      { label: "Membri", value: group?.memberCount ?? 0, hint: "coordonatori / colaboratori" },
    ],
    [group],
  );

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Dashboard coordonator</h1>
        <p className="mt-2 text-sm text-gray-300">Nu am putut încărca datele grupului.</p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/80">Dashboard coordonator</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">{group?.title ?? (loading ? "Se încarcă..." : "Grup")}</h1>
          <p className="mt-1 text-sm text-gray-300">Vizualizare doar pentru coordonare. Fără creare de foldere, cursuri sau popup-uri aici.</p>
        </div>
        <Link href="/dashboard-profesor/gestionare-cursuri" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
          Înapoi la gestionare
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{loading ? "-" : card.value}</div>
            <p className="mt-1 text-xs text-gray-300">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Conținutul modulului</h2>
            <span className="text-xs text-gray-300">{group?.kind ?? "MODULE"}</span>
          </div>

          <div className="mt-4 space-y-3">
            {(group?.courses ?? []).map((course) => (
              <div key={course.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{course.title}</p>
                    <p className="text-xs text-gray-300">{course.slug}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200">{course.visibility}</span>
                </div>
                <p className="mt-2 text-sm text-gray-300">{course.description || "Fără descriere încă."}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Nivel: {course.level}</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Necesar: {course.requiredLevel ?? "-"}</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Durată: {course.estimatedMins ?? "-"}m</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Creat: {formatDate(course.createdAt)}</div>
                </div>
              </div>
            ))}
            {!loading && (group?.courses ?? []).length === 0 ? <p className="text-sm text-gray-300">Nu există cursuri în acest modul încă.</p> : null}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Membri</h2>
            <span className="text-xs text-gray-300">{group?.visibility ?? "DRAFT"}</span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-300">Coordonator</p>
            <p className="mt-1 text-base font-semibold text-white">{group?.coordinator?.fullName ?? group?.owner.fullName ?? "Profesor"}</p>
            <p className="text-sm text-gray-300">{group?.coordinator?.email ?? group?.owner.email ?? "-"}</p>
          </div>

          <div className="mt-3 space-y-2">
            {(group?.members ?? []).map((member) => (
              <div key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{member.fullName}</p>
                <p className="text-xs text-gray-300">{member.email} • {member.role}</p>
              </div>
            ))}
            {!loading && (group?.members ?? []).length === 0 ? <p className="text-sm text-gray-300">Nu există membri adăugați încă.</p> : null}
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">Despre grup</h2>
        <p className="mt-2 text-sm text-gray-300">{group?.description || "Aici vezi doar informațiile de coordonare și structura curentă a grupului."}</p>
      </article>
    </section>
  );
}
