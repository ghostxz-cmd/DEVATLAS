"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/ThemeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Viewer = {
  fullName: string;
  email: string;
};

type ManagementPayload = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    level: string;
    visibility: string;
    estimatedMins: number | null;
    createdAt: string;
    updatedAt: string;
  };
  kpis: {
    totalStudents: number;
    activeStudents: number;
    totalLessons: number;
    publishedLessons: number;
    averageScore: number;
    feedbackCount: number;
    averageProgress: number;
    completionRate: number;
  };
  chartRange: Array<{
    key: string;
    label: string;
    enrollments: number;
    activity: number;
  }>;
  recentStudents: Array<{
    userId: string;
    name: string;
    email: string;
    enrolledAt: string;
    status: string;
    completion: number;
  }>;
  insights: {
    completionDistribution: {
      beginner: number;
      steady: number;
      advanced: number;
      completed: number;
    };
    scoreDistribution: {
      weak: number;
      medium: number;
      strong: number;
      excellent: number;
    };
    topLessons: Array<{
      lessonId: string;
      title: string;
      learners: number;
      avgCompletion: number;
      estimatedMinutes: number;
    }>;
    timeRange14d: Array<{
      key: string;
      label: string;
      minutes: number;
    }>;
    totalTimeMinutes: number;
    averageTimePerActiveStudent: number;
  };
};

type SectionKey = "general" | "grup-chat" | "module" | "taskuri" | "program" | "catalog-camera-online";

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "grup-chat", label: "Grup chat" },
  { key: "module", label: "Module" },
  { key: "taskuri", label: "Taskuri" },
  { key: "program", label: "Program" },
  { key: "catalog-camera-online", label: "Catalog camera online" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHours(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return "0 ore";
  }
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ore`;
}

function normalizeStatus(status: string) {
  return status.toLowerCase();
}

function getAccentPalette(accent: "cyan" | "emerald" | "amber" | "rose" | "violet") {
  const palette = {
    cyan: { base: "#22d3ee", soft: "rgba(34, 211, 238, 0.2)", faint: "rgba(34, 211, 238, 0.08)" },
    emerald: { base: "#22c55e", soft: "rgba(34, 197, 94, 0.2)", faint: "rgba(34, 197, 94, 0.08)" },
    amber: { base: "#f59e0b", soft: "rgba(245, 158, 11, 0.2)", faint: "rgba(245, 158, 11, 0.08)" },
    rose: { base: "#f43f5e", soft: "rgba(244, 63, 94, 0.2)", faint: "rgba(244, 63, 94, 0.08)" },
    violet: { base: "#8b5cf6", soft: "rgba(139, 92, 246, 0.2)", faint: "rgba(139, 92, 246, 0.08)" },
  };
  return palette[accent];
}

export default function CourseManagementStandalonePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = String(params?.courseId ?? "");
  const { theme, preferences } = useTheme();
  const isLight = theme === "light";
  const accent = getAccentPalette(preferences.accentColor);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [data, setData] = useState<ManagementPayload | null>(null);
  const [viewer, setViewer] = useState<Viewer>({
    fullName: "Profesor",
    email: "-",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Nu există sesiune activă de profesor.");
        }

        const fullName = String(sessionData.session?.user.user_metadata?.full_name ?? "Profesor");
        const email = String(sessionData.session?.user.email ?? "-");
        setViewer({ fullName, email });

        const response = await fetch(`/api/dashboard/instructor/courses/${courseId}/management`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca managementul cursului.");
        }

        const payload = (await response.json()) as ManagementPayload;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca managementul cursului.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      void load();
    }
  }, [courseId]);

  const maxEnrollment = useMemo(() => Math.max(...(data?.chartRange.map((item) => item.enrollments) ?? [1]), 1), [data]);
  const maxActivity = useMemo(() => Math.max(...(data?.chartRange.map((item) => item.activity) ?? [1]), 1), [data]);
  const maxTimeMinutes = useMemo(() => Math.max(...(data?.insights.timeRange14d.map((item) => item.minutes) ?? [1]), 1), [data]);
  const avgEnrollmentsPerDay = useMemo(() => {
    const values = data?.chartRange ?? [];
    if (values.length === 0) {
      return 0;
    }
    return Math.round(values.reduce((sum, item) => sum + item.enrollments, 0) / values.length);
  }, [data]);

  const highPerformers = useMemo(
    () => (data?.recentStudents ?? []).filter((student) => student.completion >= 70).length,
    [data],
  );

  const completionDistributionEntries = useMemo(
    () => [
      { label: "Sub 25%", value: data?.insights.completionDistribution.beginner ?? 0 },
      { label: "25-59%", value: data?.insights.completionDistribution.steady ?? 0 },
      { label: "60-99%", value: data?.insights.completionDistribution.advanced ?? 0 },
      { label: "100%", value: data?.insights.completionDistribution.completed ?? 0 },
    ],
    [data],
  );

  const scoreDistributionEntries = useMemo(
    () => [
      { label: "<50", value: data?.insights.scoreDistribution.weak ?? 0 },
      { label: "50-74", value: data?.insights.scoreDistribution.medium ?? 0 },
      { label: "75-89", value: data?.insights.scoreDistribution.strong ?? 0 },
      { label: "90+", value: data?.insights.scoreDistribution.excellent ?? 0 },
    ],
    [data],
  );

  const maxCompletionDistribution = useMemo(
    () => Math.max(...completionDistributionEntries.map((item) => item.value), 1),
    [completionDistributionEntries],
  );

  const maxScoreDistribution = useMemo(
    () => Math.max(...scoreDistributionEntries.map((item) => item.value), 1),
    [scoreDistributionEntries],
  );

  const surfaceClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
    : "border-white/10 bg-[#0b1220] text-slate-100 shadow-[0_14px_32px_rgba(2,6,23,0.35)]";

  const mutedTextClass = isLight ? "text-slate-500" : "text-slate-400";
  const headingTextClass = isLight ? "text-slate-900" : "text-slate-100";
  const viewerInitial = (viewer.fullName.trim().charAt(0) || "P").toUpperCase();

  return (
    <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-[#040816]"} text-neutral-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl"
          style={{ background: accent.faint }}
        />
        <div
          className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: isLight ? "rgba(15, 23, 42, 0.06)" : "rgba(148, 163, 184, 0.06)" }}
        />
      </div>

      <section className={`relative grid min-h-screen w-full grid-cols-[260px_minmax(0,1fr)] ${isLight ? "bg-[#f7f9fc]/85" : "bg-[#050b1a]/90"}`}>
        <aside className={`border-r p-5 ${isLight ? "border-slate-200 bg-white/75" : "border-white/10 bg-[#0a1325]/70"}`}>
          <div className={`mb-5 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0f1a31]"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#0b1220]"}`}>
                <Image
                  src={isLight ? "/logos/Negru.png" : "/logos/Alb.png"}
                  alt="DevAtlas"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mutedTextClass}`}>DevAtlas</p>
                <p className={`truncate text-sm font-semibold ${headingTextClass}`}>{viewer.fullName}</p>
                <p className={`truncate text-xs ${mutedTextClass}`}>{viewer.email}</p>
              </div>
              <div
                className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${isLight ? "text-slate-900" : "text-white"}`}
                style={{ background: isLight ? accent.soft : accent.base }}
              >
                {viewerInitial}
              </div>
            </div>
          </div>

          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>Course Admin</p>
          <h2 className={`mt-1 text-xl font-bold ${headingTextClass}`}>Management curs</h2>

          <div className="mt-6 space-y-2">
            {sections.map((section) => {
              const active = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "text-white"
                      : isLight
                        ? "border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                        : "border-white/10 bg-[#111b30] text-slate-300 hover:text-white"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: accent.base,
                          background: isLight ? accent.base : accent.soft,
                          boxShadow: isLight ? "0 8px 18px rgba(15,23,42,0.16)" : "0 10px 22px rgba(2,6,23,0.35)",
                        }
                      : undefined
                  }
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard-profesor/gestionare-cursuri"
            className={`mt-8 inline-flex rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              isLight ? "border-slate-300 bg-white text-slate-700" : "border-white/15 bg-[#0f1a31] text-slate-200"
            }`}
          >
            Inapoi la cursuri
          </Link>
        </aside>

        <div className="p-6 sm:p-8">
          {loading && (
            <div className={`rounded-2xl border p-5 text-sm ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-[#0b1220] text-slate-300"}`}>
              Se incarca dashboard-ul cursului...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Course workspace / dashboard</p>
                  <h1 className={`text-[32px] font-bold leading-tight ${headingTextClass}`}>{data.course.title}</h1>
                  <p className={`text-sm ${mutedTextClass}`}>
                    {data.course.level} • {data.course.visibility} • {formatHours(data.course.estimatedMins)}
                  </p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-white/15 bg-[#111a2d] text-slate-200"}`}>
                  Updated {formatDate(data.course.updatedAt)}
                </div>
              </header>

              {activeSection === "general" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Studenti</p>
                      <p className="mt-2 text-3xl font-bold">{data.kpis.totalStudents}</p>
                      <p className="mt-1 text-xs" style={{ color: accent.base }}>{data.kpis.activeStudents} activi acum</p>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Lectii publicate</p>
                      <p className="mt-2 text-3xl font-bold">{data.kpis.publishedLessons}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>din {data.kpis.totalLessons} totale</p>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Progress mediu</p>
                      <p className="mt-2 text-3xl font-bold">{data.kpis.averageProgress}%</p>
                      <p className="mt-1 text-xs" style={{ color: accent.base }}>finalizare {data.kpis.completionRate}%</p>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Rating</p>
                      <p className="mt-2 text-3xl font-bold">{data.kpis.averageScore.toFixed(1)}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>{data.kpis.feedbackCount} review-uri</p>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Enrollments (7 zile)</h3>
                      <div className="mt-3 flex h-40 items-end gap-2">
                        {data.chartRange.map((item) => (
                          <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-md"
                              style={{
                                background: accent.base,
                                opacity: 0.9,
                                height: `${Math.max(8, (item.enrollments / maxEnrollment) * 120)}px`,
                              }}
                            />
                            <span className={`text-[10px] ${mutedTextClass}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Activitate (7 zile)</h3>
                      <div className={`mt-3 h-40 rounded-xl border p-2 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                        <svg viewBox="0 0 300 120" className="h-full w-full">
                          <polyline
                            fill="none"
                            stroke={accent.base}
                            strokeWidth="3"
                            points={data.chartRange
                              .map((item, index) => {
                                const x = (index / Math.max(1, data.chartRange.length - 1)) * 280 + 10;
                                const y = 110 - (item.activity / maxActivity) * 88;
                                return `${x},${Math.max(12, y)}`;
                              })
                              .join(" ")}
                          />
                        </svg>
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Course pulse</h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                          <span className={mutedTextClass}>Medie enroll/zi</span>
                          <span className="font-semibold">{avgEnrollmentsPerDay}</span>
                        </div>
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                          <span className={mutedTextClass}>Top performers</span>
                          <span className="font-semibold" style={{ color: accent.base }}>{highPerformers}</span>
                        </div>
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                          <span className={mutedTextClass}>Feedback total</span>
                          <span className="font-semibold">{data.kpis.feedbackCount}</span>
                        </div>
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                          <span className={mutedTextClass}>Timp total invatare (14z)</span>
                          <span className="font-semibold">{data.insights.totalTimeMinutes} min</span>
                        </div>
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                          <span className={mutedTextClass}>Medie / student activ</span>
                          <span className="font-semibold">{data.insights.averageTimePerActiveStudent} min</span>
                        </div>
                      </div>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-3">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Distribuție progres studenți</h3>
                      <div className="mt-3 space-y-2">
                        {completionDistributionEntries.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={mutedTextClass}>{item.label}</span>
                              <span className="font-semibold">{item.value}</span>
                            </div>
                            <div className={`h-2 rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  background: accent.base,
                                  width: `${Math.max(6, (item.value / maxCompletionDistribution) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Distribuție scor feedback</h3>
                      <div className="mt-3 space-y-2">
                        {scoreDistributionEntries.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={mutedTextClass}>{item.label}</span>
                              <span className="font-semibold">{item.value}</span>
                            </div>
                            <div className={`h-2 rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  background: accent.base,
                                  width: `${Math.max(6, (item.value / maxScoreDistribution) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Timp de învățare (14 zile)</h3>
                      <div className="mt-3 flex h-40 items-end gap-1.5">
                        {data.insights.timeRange14d.map((item) => (
                          <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-sm"
                              style={{
                                background: accent.base,
                                opacity: 0.85,
                                height: `${Math.max(4, (item.minutes / maxTimeMinutes) * 110)}px`,
                              }}
                            />
                            <span className={`text-[9px] ${mutedTextClass}`}>{item.label.slice(-2)}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <article className={`mt-4 rounded-2xl border p-4 ${surfaceClass}`}>
                    <h3 className="text-sm font-semibold">Top lecții după engagement</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {data.insights.topLessons.map((lesson) => (
                        <div
                          key={lesson.lessonId}
                          className={`rounded-lg border px-3 py-2 text-sm ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}
                        >
                          <p className={`font-semibold ${headingTextClass}`}>{lesson.title}</p>
                          <p className={`mt-1 text-xs ${mutedTextClass}`}>
                            {lesson.learners} studenti • {lesson.avgCompletion}% completare • {lesson.estimatedMinutes} min
                          </p>
                        </div>
                      ))}
                      {data.insights.topLessons.length === 0 && <p className={`text-sm ${mutedTextClass}`}>Nu există încă date de engagement pe lecții.</p>}
                    </div>
                  </article>

                  <article className={`mt-4 rounded-2xl border p-4 ${surfaceClass}`}>
                    <h3 className="text-sm font-semibold">Studenti recenti</h3>
                    <div className="mt-3 space-y-2">
                      {data.recentStudents.slice(0, 8).map((student) => (
                        <div
                          key={`${student.userId}-${student.enrolledAt}`}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}
                        >
                          <div>
                            <p className={`font-semibold ${headingTextClass}`}>{student.name}</p>
                            <p className={`text-xs ${mutedTextClass}`}>{student.email}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className={mutedTextClass}>{formatDate(student.enrolledAt)}</p>
                            <p style={{ color: accent.base }}>{normalizeStatus(student.status)} • {student.completion}%</p>
                          </div>
                        </div>
                      ))}
                      {data.recentStudents.length === 0 && <p className={`text-sm ${mutedTextClass}`}>Fara studenti momentan.</p>}
                    </div>
                  </article>
                </>
              ) : (
                <div className={`rounded-2xl border border-dashed p-10 text-center ${isLight ? "border-slate-300 bg-white" : "border-white/20 bg-[#0b1220]"}`}>
                  <h3 className={`text-lg font-bold ${headingTextClass}`}>{sections.find((item) => item.key === activeSection)?.label}</h3>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>Secțiune adăugată. Momentan rămâne nedezvoltată.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
