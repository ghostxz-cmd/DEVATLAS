"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type DashboardData = {
  summary: {
    coursesActive: number;
    coursesDraft: number;
    coursesInReview: number;
    totalCourses: number;
    totalStudents: number;
    totalLessons: number;
    averageFeedback: number;
    recentActivityCount: number;
    profileCompletion: number;
  };
  courses: Array<{
    courseId: string;
    title: string;
    slug: string;
    level: string;
    category: string | null;
    thumbnailUrl: string | null;
    estimatedMins: number | null;
    createdAt: string;
    status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
    lessonCount: number;
    enrollmentCount: number;
    studentCount: number;
    averageRating: number | null;
    reviewCount: number;
    visibility: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function InstructorCourseManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Nu există o sesiune activă de profesor.");
        }

        const response = await fetch("/api/dashboard/instructor/overview", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca cursurile.");
        }

        const payload = (await response.json()) as DashboardData;
        setData(payload);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nu am putut încărca cursurile."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.courses ?? []).filter((course) => {
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesQuery = !needle || [course.title, course.slug, course.category, course.level].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [data, query, statusFilter]);

  const cards = [
    {
      label: "Cursuri publicate",
      value: data?.summary.coursesActive ?? 0,
      hint: "Active pe platformă",
    },
    {
      label: "Drafturi",
      value: data?.summary.coursesDraft ?? 0,
      hint: "În lucru",
    },
    {
      label: "În review",
      value: data?.summary.coursesInReview ?? 0,
      hint: "Așteaptă validare",
    },
    {
      label: "Lecții totale",
      value: data?.summary.totalLessons ?? 0,
      hint: "În toate cursurile",
    },
    {
      label: "Feedback mediu",
      value: data?.summary.averageFeedback ?? 0,
      hint: "Scor real din review-uri",
    },
  ];

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Gestionare cursuri</h1>
        <p className="mt-2 text-sm text-gray-300">
          Nu am putut încărca datele cursurilor.
        </p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Gestionare cursuri</h1>
          <p className="mt-1 text-sm text-gray-300">Gestionarea cursurilor proprii pe baza datelor reale din platformă.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          {loading ? "syncing" : "active"}
        </div>
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

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după titlu, slug, nivel sau categorie..."
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">Toate statusurile</option>
            <option value="PUBLISHED">Publicate</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">În review</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pipeline conținut</h3>
          <span className="text-xs text-gray-300">{filteredCourses.length} rezultate</span>
        </div>

        {loading ? (
          <div className="mt-4 text-center text-sm text-gray-300">Încărcare...</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <div key={course.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{course.title}</p>
                      <p className="text-xs text-gray-300">{course.category || "General"} • {course.level}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                      {course.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Lecții: {course.lessonCount}</div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Studenți: {course.studentCount}</div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Review-uri: {course.reviewCount}</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (course.averageRating ?? 0) * 20)}%` }} />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-300">
                    <span>{course.averageRating ?? 0}/5 feedback</span>
                    <span>{course.estimatedMins ?? 0} min</span>
                  </div>

                  <p className="mt-3 text-[11px] text-gray-400">Creat la {formatDate(course.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-sm text-gray-300">
                Nu au fost găsite cursuri pentru filtrele curente.
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
