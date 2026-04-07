"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardOverview = {
  summary: {
    enrolledCourses: number;
    activeCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    totalXp: number;
    profileCompletion: number;
    courseCompletion: number;
    recentActivityCount: number;
    openSupportTickets: number;
  };
  courses: Array<{
    courseId: string;
    title: string;
    slug: string;
    level: string;
    category: string | null;
    thumbnailUrl: string | null;
    estimatedMins: number | null;
    enrolledAt: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    lastActivityAt: string;
    nextLessonTitle: string | null;
    status: string;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentDashboardCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/student/overview", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca cursurile.");
        }

        const payload = (await response.json()) as DashboardOverview;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca cursurile.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const course of data?.courses ?? []) {
      if (course.category) {
        values.add(course.category);
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const levels = useMemo(() => {
    const values = new Set<string>();
    for (const course of data?.courses ?? []) {
      if (course.level) {
        values.add(course.level);
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const filteredCourses = useMemo(() => {
    return (data?.courses ?? []).filter((course) => {
      const matchesQuery = !query.trim() || [course.title, course.category, course.level, course.slug].filter(Boolean).some((value) => String(value).toLowerCase().includes(query.trim().toLowerCase()));
      const matchesCategory = categoryFilter === "all" || (course.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      const matchesLevel = levelFilter === "all" || course.level.toLowerCase() === levelFilter.toLowerCase();
      return matchesQuery && matchesCategory && matchesLevel;
    });
  }, [data, query, categoryFilter, levelFilter]);

  if (error) {
    return (
      <section className="space-y-4 text-[#111827]">
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <h1 className="text-2xl font-bold tracking-tight">Cursuri</h1>
          <p className="mt-2 text-sm text-[#64748b]">Nu am putut încărca lista de cursuri.</p>
          <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Cursuri</h1>
          <p className="mt-1 text-sm text-[#64748b]">Lista reală a cursurilor la care ești enrolled și progresul lor.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Enrolled</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.enrolledCourses ?? 0}</div>
          <p className="mt-1 text-xs text-[#64748b]">Cursuri asociate contului tău.</p>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Active</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.activeCourses ?? 0}</div>
          <p className="mt-1 text-xs text-[#64748b]">Cursuri în lucru acum.</p>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Finalizate</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.completedCourses ?? 0}</div>
          <p className="mt-1 text-xs text-[#64748b]">Cursuri duse la capăt.</p>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Progres total</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.courseCompletion ?? 0}%</div>
          <p className="mt-1 text-xs text-[#64748b]">Media progresului real.</p>
        </article>
      </div>

      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.7fr_0.7fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după nume curs sau categorie..."
            className="h-11 rounded-2xl border border-[#d5daea] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#93c5fd]"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-11 rounded-2xl border border-[#d5daea] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#93c5fd]"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Toate categoriile" : category}
              </option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="h-11 rounded-2xl border border-[#d5daea] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#93c5fd]"
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {level === "all" ? "Orice nivel" : level}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {filteredCourses.map((course) => (
          <article key={course.courseId} className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">{course.category || "General"}</p>
                <h2 className="mt-1 text-lg font-bold text-[#0f172a]">{course.title}</h2>
                <p className="mt-1 text-sm text-[#64748b]">Nivel: {course.level} • Status: {course.status}</p>
              </div>
              <div className="rounded-full border border-[#d5daea] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#334155]">
                {course.progressPercent}%
              </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-[#e2e8f0]">
              <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${course.progressPercent}%` }} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Lecții: {course.completedLessons}/{course.totalLessons}</div>
              <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Durată: {course.estimatedMins ?? "--"} min</div>
              <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Înscris: {formatDate(course.enrolledAt)}</div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Următoarea lecție</p>
              <p className="mt-1 text-sm font-semibold text-[#0f172a]">{course.nextLessonTitle || "Nu există încă o lecție următoare disponibilă."}</p>
              <p className="mt-1 text-xs text-[#64748b]">Ultima activitate: {formatDate(course.lastActivityAt)} • {formatTime(course.lastActivityAt)}</p>
            </div>
          </article>
        ))}
      </div>

      {!loading && filteredCourses.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#d5daea] bg-white p-6 text-sm text-[#64748b] shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          Nu există cursuri care să corespundă filtrelor curente sau nu ai încă enrolments.
        </div>
      )}
    </section>
  );
}
