"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/ThemeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type StudentCourseDashboardPayload = {
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
  myStats: {
    enrolledAt: string;
    status: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    nextLessonTitle: string | null;
    lastActivityAt: string | null;
    totalTimeMinutes: number;
  };
  classStats: {
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    completionRate: number;
    averageScore: number;
    feedbackCount: number;
  };
  chartRange: Array<{
    key: string;
    label: string;
    classEnrollments: number;
    classActivity: number;
    myActivity: number;
  }>;
  topClassStudents: Array<{
    userId: string;
    completion: number;
    name: string;
    email: string;
  }>;
  sectionHints: {
    catalog: string;
    cameraOnline: string;
  };
};

type Viewer = {
  fullName: string;
  email: string;
};

type SectionKey = "general" | "grup-chat" | "module" | "taskuri" | "program" | "catalog" | "camera-online";

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "grup-chat", label: "Grup chat" },
  { key: "module", label: "Module" },
  { key: "taskuri", label: "Taskuri" },
  { key: "program", label: "Program" },
  { key: "catalog", label: "Catalog" },
  { key: "camera-online", label: "Camera online" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHours(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return "0 ore";
  }

  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ore`;
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

export default function StudentCourseDashboardPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = String(params?.courseId ?? "");

  const { theme, preferences } = useTheme();
  const isLight = theme === "light";
  const accent = getAccentPalette(preferences.accentColor);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [data, setData] = useState<StudentCourseDashboardPayload | null>(null);
  const [viewer, setViewer] = useState<Viewer>({ fullName: "Elev", email: "-" });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();

        setViewer({
          fullName: String(sessionData.session?.user.user_metadata?.full_name ?? "Elev"),
          email: String(sessionData.session?.user.email ?? "-"),
        });

        const response = await fetch(`/api/dashboard/student/courses/${courseId}/dashboard`, { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca dashboard-ul cursului.");
        }

        const payload = (await response.json()) as StudentCourseDashboardPayload;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca dashboard-ul cursului.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      void load();
    }
  }, [courseId]);

  const maxClassEnrollments = useMemo(() => Math.max(...(data?.chartRange.map((item) => item.classEnrollments) ?? [1]), 1), [data]);
  const maxClassActivity = useMemo(() => Math.max(...(data?.chartRange.map((item) => item.classActivity) ?? [1]), 1), [data]);
  const maxMyActivity = useMemo(() => Math.max(...(data?.chartRange.map((item) => item.myActivity) ?? [1]), 1), [data]);

  const surfaceClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
    : "border-white/10 bg-[#0b1220] text-slate-100 shadow-[0_14px_32px_rgba(2,6,23,0.35)]";

  const mutedTextClass = isLight ? "text-slate-500" : "text-slate-400";
  const headingTextClass = isLight ? "text-slate-900" : "text-slate-100";
  const viewerInitial = (viewer.fullName.trim().charAt(0) || "E").toUpperCase();

  return (
    <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-[#040816]"} text-neutral-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: accent.faint }} />
      </div>

      <section className={`relative grid min-h-screen w-full grid-cols-[260px_minmax(0,1fr)] ${isLight ? "bg-[#f7f9fc]/85" : "bg-[#050b1a]/90"}`}>
        <aside className={`border-r p-5 ${isLight ? "border-slate-200 bg-white/75" : "border-white/10 bg-[#0a1325]/70"}`}>
          <div className={`mb-5 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0f1a31]"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#0b1220]"}`}>
                <Image src={isLight ? "/logos/Negru.png" : "/logos/Alb.png"} alt="DevAtlas" width={40} height={40} className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mutedTextClass}`}>DevAtlas</p>
                <p className={`truncate text-sm font-semibold ${headingTextClass}`}>{viewer.fullName}</p>
                <p className={`truncate text-xs ${mutedTextClass}`}>{viewer.email}</p>
              </div>
              <div className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${isLight ? "text-slate-900" : "text-white"}`} style={{ background: isLight ? accent.soft : accent.base }}>
                {viewerInitial}
              </div>
            </div>
          </div>

          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>Student Course Hub</p>
          <h2 className={`mt-1 text-xl font-bold ${headingTextClass}`}>Dashboard curs</h2>

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
                  style={active ? { borderColor: accent.base, background: isLight ? accent.base : accent.soft } : undefined}
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard-elev/cursuri"
            className={`mt-8 inline-flex rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              isLight ? "border-slate-300 bg-white text-slate-700" : "border-white/15 bg-[#0f1a31] text-slate-200"
            }`}
          >
            Inapoi la cursuri
          </Link>
        </aside>

        <div className="p-6 sm:p-8">
          {loading && <div className={`rounded-2xl border p-5 text-sm ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-[#0b1220] text-slate-300"}`}>Se incarca dashboard-ul cursului...</div>}

          {!loading && error && <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>}

          {!loading && !error && data && (
            <>
              <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Student workspace / course dashboard</p>
                  <h1 className={`text-[32px] font-bold leading-tight ${headingTextClass}`}>{data.course.title}</h1>
                  <p className={`text-sm ${mutedTextClass}`}>{data.course.level} • {data.course.visibility} • {formatHours(data.course.estimatedMins)}</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-white/15 bg-[#111a2d] text-slate-200"}`}>
                  Enrolled {formatDate(data.myStats.enrolledAt)}
                </div>
              </header>

              {activeSection === "general" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Progresul meu</p>
                      <p className="mt-2 text-3xl font-bold">{data.myStats.progressPercent}%</p>
                      <p className="mt-1 text-xs" style={{ color: accent.base }}>{data.myStats.completedLessons}/{data.myStats.totalLessons} lecții</p>
                    </article>
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Timp învățare</p>
                      <p className="mt-2 text-3xl font-bold">{data.myStats.totalTimeMinutes} min</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>Status: {data.myStats.status}</p>
                    </article>
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Clasă activă</p>
                      <p className="mt-2 text-3xl font-bold">{data.classStats.activeStudents}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>din {data.classStats.totalStudents} studenți</p>
                    </article>
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Scor clasă</p>
                      <p className="mt-2 text-3xl font-bold">{data.classStats.averageScore.toFixed(1)}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>{data.classStats.feedbackCount} feedback-uri</p>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Enrollments clasă (7 zile)</h3>
                      <div className="mt-3 flex h-36 items-end gap-2">
                        {data.chartRange.map((item) => (
                          <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                            <div className="w-full rounded-t-md" style={{ background: accent.base, opacity: 0.85, height: `${Math.max(6, (item.classEnrollments / maxClassEnrollments) * 110)}px` }} />
                            <span className={`text-[10px] ${mutedTextClass}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Activitate clasă (7 zile)</h3>
                      <div className={`mt-3 h-36 rounded-xl border p-2 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                        <svg viewBox="0 0 300 120" className="h-full w-full">
                          <polyline
                            fill="none"
                            stroke={accent.base}
                            strokeWidth="3"
                            points={data.chartRange
                              .map((item, index) => {
                                const x = (index / Math.max(1, data.chartRange.length - 1)) * 280 + 10;
                                const y = 110 - (item.classActivity / maxClassActivity) * 88;
                                return `${x},${Math.max(12, y)}`;
                              })
                              .join(" ")}
                          />
                        </svg>
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Activitatea mea (7 zile)</h3>
                      <div className="mt-3 flex h-36 items-end gap-2">
                        {data.chartRange.map((item) => (
                          <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                            <div className="w-full rounded-t-md" style={{ background: accent.base, opacity: 0.85, height: `${Math.max(6, (item.myActivity / maxMyActivity) * 110)}px` }} />
                            <span className={`text-[10px] ${mutedTextClass}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Următorul pas</h3>
                      <div className="mt-3 rounded-xl border border-dashed p-3 text-sm">
                        <p className={headingTextClass}>{data.myStats.nextLessonTitle || "Ai finalizat tot ce este public momentan."}</p>
                        <p className={`mt-1 text-xs ${mutedTextClass}`}>Ultima activitate: {formatDateTime(data.myStats.lastActivityAt)}</p>
                      </div>
                    </article>

                    <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                      <h3 className="text-sm font-semibold">Top elevi clasă</h3>
                      <div className="mt-3 space-y-2">
                        {data.topClassStudents.map((student) => (
                          <div key={student.userId} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                            <div>
                              <p className={`font-semibold ${headingTextClass}`}>{student.name}</p>
                              <p className={`text-xs ${mutedTextClass}`}>{student.email}</p>
                            </div>
                            <p className="text-xs font-semibold" style={{ color: accent.base }}>{student.completion}%</p>
                          </div>
                        ))}
                        {data.topClassStudents.length === 0 && <p className={`text-sm ${mutedTextClass}`}>Fără date de clasament momentan.</p>}
                      </div>
                    </article>
                  </div>
                </>
              ) : activeSection === "catalog" ? (
                <div className={`rounded-2xl border border-dashed p-10 text-center ${isLight ? "border-slate-300 bg-white" : "border-white/20 bg-[#0b1220]"}`}>
                  <h3 className={`text-lg font-bold ${headingTextClass}`}>Catalog</h3>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>{data.sectionHints.catalog}</p>
                </div>
              ) : activeSection === "camera-online" ? (
                <div className={`rounded-2xl border border-dashed p-10 text-center ${isLight ? "border-slate-300 bg-white" : "border-white/20 bg-[#0b1220]"}`}>
                  <h3 className={`text-lg font-bold ${headingTextClass}`}>Camera online</h3>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>{data.sectionHints.cameraOnline}</p>
                </div>
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
