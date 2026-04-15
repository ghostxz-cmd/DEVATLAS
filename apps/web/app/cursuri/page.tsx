"use client";

import { useEffect, useMemo, useState } from "react";

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

function formatHoursFromMinutes(totalMinutes: number | null) {
  if (!totalMinutes || totalMinutes <= 0) {
    return "0 ore";
  }

  const hours = totalMinutes / 60;
  const rounded = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  return `${rounded} ore`;
}

export default function CursuriPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [submittingCourseId, setSubmittingCourseId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/courses/public", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca cursurile publice.");
        }

        const payload = (await response.json()) as { courses?: PublicCourse[] };
        setCourses(payload.courses ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca cursurile publice.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const levels = useMemo(() => {
    const values = new Set(courses.map((course) => course.level));
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery = !needle || [course.title, course.description, course.category, course.instructorName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const matchesLevel = levelFilter === "all" || course.level.toLowerCase() === levelFilter.toLowerCase();
      return matchesQuery && matchesLevel;
    });
  }, [courses, query, levelFilter]);

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

      setCourses((previous) => previous.map((course) => (
        course.courseId === courseId
          ? { ...course, isEnrolled: true }
          : course
      )));
      setNotice(payload?.alreadyEnrolled ? "Erai deja enrolled la acest curs." : "Enroll realizat cu succes.");
    } catch (enrollError) {
      setNotice(enrollError instanceof Error ? enrollError.message : "Nu am putut face enroll.");
    } finally {
      setSubmittingCourseId(null);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#030712] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Cursuri publice</h1>
          <p className="mt-2 text-sm text-gray-300">
            Aici apar automat cursurile setate ca Published din dashboard-ul profesor.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.6fr]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Caută după titlu, categorie, instructor..."
              className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
            />
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level === "all" ? "Toate nivelurile" : level}
                </option>
              ))}
            </select>
          </div>

          {notice && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
              {notice}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-3xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
            {error}
          </div>
        )}

        {!error && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <article key={course.courseId} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">{course.category ?? "General"}</p>
                    <h2 className="mt-1 text-lg font-bold text-white">{course.title}</h2>
                    <p className="mt-1 text-xs text-gray-300">Nivel: {course.level} • {formatHoursFromMinutes(course.estimatedMins)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                    {course.language.toUpperCase()}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-300">
                  {course.description?.trim() || "Acest curs este publicat și disponibil pentru enroll."}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>Instructor: {course.instructorName}</span>
                  <span>Creat: {formatDate(course.createdAt)}</span>
                </div>

                <button
                  type="button"
                  disabled={course.isEnrolled || submittingCourseId === course.courseId}
                  onClick={() => handleEnroll(course.courseId)}
                  className="mt-4 h-10 w-full rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {course.isEnrolled
                    ? "Ești enrolled"
                    : submittingCourseId === course.courseId
                      ? "Se procesează..."
                      : "Enroll"}
                </button>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && filteredCourses.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#030712] p-6 text-sm text-gray-300">
            Nu există cursuri publice pentru filtrele selectate.
          </div>
        )}
      </section>
    </main>
  );
}
