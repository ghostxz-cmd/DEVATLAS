"use client";

import Link from "next/link";
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

type PublicCourse = {
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  category: string | null;
  thumbnailUrl: string | null;
  estimatedMins: number | null;
  createdAt: string;
  instructorName: string;
  isEnrolled: boolean;
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

function formatHoursFromMinutes(totalMinutes: number | null) {
  if (!totalMinutes || totalMinutes <= 0) {
    return "0 ore";
  }

  const hours = totalMinutes / 60;
  const rounded = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  return `${rounded} ore`;
}

export default function StudentDashboardCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [catalogCourses, setCatalogCourses] = useState<PublicCourse[]>([]);
  const [enrolledQuery, setEnrolledQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [submittingCourseId, setSubmittingCourseId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewResponse, catalogResponse] = await Promise.all([
          fetch("/api/dashboard/student/overview", { cache: "no-store" }),
          fetch("/api/courses/public", { cache: "no-store" }),
        ]);

        if (!overviewResponse.ok) {
          const payload = (await overviewResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca cursurile.");
        }

        if (!catalogResponse.ok) {
          const payload = (await catalogResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca catalogul public.");
        }

        const [overviewPayload, catalogPayload] = await Promise.all([
          overviewResponse.json() as Promise<DashboardOverview>,
          catalogResponse.json() as Promise<{ courses?: PublicCourse[] }>,
        ]);

        setData(overviewPayload);
        setCatalogCourses(catalogPayload.courses ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca cursurile.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setSubmittingCourseId(courseId);
    setNotice(null);

    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; alreadyEnrolled?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut face enroll.");
      }

      const [overviewResponse, catalogResponse] = await Promise.all([
        fetch("/api/dashboard/student/overview", { cache: "no-store" }),
        fetch("/api/courses/public", { cache: "no-store" }),
      ]);

      if (overviewResponse.ok) {
        const overviewPayload = (await overviewResponse.json()) as DashboardOverview;
        setData(overviewPayload);
      }

      if (catalogResponse.ok) {
        const catalogPayload = (await catalogResponse.json()) as { courses?: PublicCourse[] };
        setCatalogCourses(catalogPayload.courses ?? []);
      }

      setNotice(payload?.alreadyEnrolled ? "Erai deja enrolled la acest curs." : "Enroll realizat cu succes.");
    } catch (enrollError) {
      setNotice(enrollError instanceof Error ? enrollError.message : "Nu am putut face enroll.");
    } finally {
      setSubmittingCourseId(null);
    }
  };

  const enrolledCourses = data?.courses ?? [];

  const enrolledFiltered = useMemo(() => {
    const needle = enrolledQuery.trim().toLowerCase();
    return enrolledCourses.filter((course) => {
      return !needle || [course.title, course.category, course.level, course.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [enrolledCourses, enrolledQuery]);

  const enrolledSet = useMemo(() => new Set(enrolledCourses.map((course) => course.courseId)), [enrolledCourses]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const course of catalogCourses) {
      if (course.category) {
        values.add(course.category);
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [catalogCourses]);

  const levels = useMemo(() => {
    const values = new Set<string>();
    for (const course of catalogCourses) {
      if (course.level) {
        values.add(course.level);
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [catalogCourses]);

  const catalogFiltered = useMemo(() => {
    const needle = catalogQuery.trim().toLowerCase();
    return catalogCourses.filter((course) => {
      if (enrolledSet.has(course.courseId)) {
        return false;
      }

      const matchesQuery = !needle || [course.title, course.description, course.category, course.instructorName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));

      const matchesCategory = categoryFilter === "all" || (course.category ?? "").toLowerCase() === categoryFilter.toLowerCase();
      const matchesLevel = levelFilter === "all" || course.level.toLowerCase() === levelFilter.toLowerCase();

      return matchesQuery && matchesCategory && matchesLevel;
    });
  }, [catalogCourses, catalogQuery, categoryFilter, levelFilter, enrolledSet]);

  if (error) {
    return (
      <section className="space-y-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-[#030712] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <h1 className="text-2xl font-bold tracking-tight">Cursuri</h1>
          <p className="mt-2 text-sm text-gray-300">Nu am putut încărca datele.</p>
          <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Cursuri</h1>
          <p className="mt-1 text-sm text-gray-300">Sistemul tău de enroll: secțiune separată pentru enrolled + catalog separat.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Enrolled</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.enrolledCourses ?? 0}</div>
          <p className="mt-1 text-xs text-gray-300">Cursuri la care ești deja înscris.</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Active</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.activeCourses ?? 0}</div>
          <p className="mt-1 text-xs text-gray-300">Cursuri active în progres.</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Finalizate</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.completedCourses ?? 0}</div>
          <p className="mt-1 text-xs text-gray-300">Cursuri terminate complet.</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Progres total</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{data?.summary.courseCompletion ?? 0}%</div>
          <p className="mt-1 text-xs text-gray-300">Media progresului tău.</p>
        </article>
      </div>

      {notice && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">{notice}</div>
      )}

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Cursuri enrolled</h2>
          <div className="text-xs text-gray-300">{enrolledFiltered.length} rezultate</div>
        </div>

        <div className="mt-4">
          <input
            value={enrolledQuery}
            onChange={(event) => setEnrolledQuery(event.target.value)}
            placeholder="Caută în cursurile enrolled..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
          />
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {enrolledFiltered.map((course) => (
            <article key={course.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{course.category || "General"}</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{course.title}</h3>
                  <p className="mt-1 text-sm text-gray-300">Nivel: {course.level} • Status: {course.status}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-gray-200">
                  {course.progressPercent}%
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full bg-[#e2e8f0]">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${course.progressPercent}%` }} />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Lecții: {course.completedLessons}/{course.totalLessons}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Durată: {formatHoursFromMinutes(course.estimatedMins)}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Înscris: {formatDate(course.enrolledAt)}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Următoarea lecție</p>
                <p className="mt-1 text-sm font-semibold text-white">{course.nextLessonTitle || "Nu există încă o lecție următoare disponibilă."}</p>
                <p className="mt-1 text-xs text-gray-300">Ultima activitate: {formatDate(course.lastActivityAt)} • {formatTime(course.lastActivityAt)}</p>
              </div>

              <Link
                href={`/dashboard-elev-management/${course.courseId}`}
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-500/25 px-4 text-base font-bold text-cyan-100 transition hover:bg-cyan-500/35"
              >
                Dashboard curs
              </Link>
            </article>
          ))}
        </div>

        {!loading && enrolledFiltered.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            Nu ai încă niciun curs enrolled.
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <h2 className="text-lg font-bold text-white">Catalog cursuri</h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.7fr_0.7fr]">
          <input
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="Caută în catalog..."
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category === "all" ? "Toate categoriile" : category}</option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
          >
            {levels.map((level) => (
              <option key={level} value={level}>{level === "all" ? "Orice nivel" : level}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catalogFiltered.map((course) => (
            <div key={course.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">{course.category ?? "General"}</p>
              <h3 className="mt-1 text-base font-bold text-white">{course.title}</h3>
              <p className="mt-1 text-xs text-gray-300">{course.level} • {formatHoursFromMinutes(course.estimatedMins)}</p>
              <p className="mt-2 text-sm text-gray-300">{course.description?.trim() || "Curs disponibil pentru enroll."}</p>
              <p className="mt-2 text-xs text-gray-400">Instructor: {course.instructorName}</p>

              <button
                type="button"
                disabled={submittingCourseId === course.courseId}
                onClick={() => handleEnroll(course.courseId)}
                className="mt-3 h-10 w-full rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingCourseId === course.courseId ? "Se procesează..." : "Enroll"}
              </button>
            </div>
          ))}
        </div>

        {!loading && catalogFiltered.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            Nu există cursuri în catalog pentru filtrele curente.
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <h2 className="text-lg font-bold text-white">Camera online</h2>
        <p className="mt-2 text-sm text-gray-300">
          Secțiune separată de catalog. Aici vor intra sesiunile live, prezența și accesul în camerele online.
        </p>
      </article>
    </section>
  );
}
