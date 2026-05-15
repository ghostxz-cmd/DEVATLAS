"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/ThemeProvider";
import CourseGroupChatPanel from "@/components/course/CourseGroupChatPanel";
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

type SectionKey = "general" | "grup-chat" | "module";

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "grup-chat", label: "Grup chat" },
  { key: "module", label: "Module" },
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>({ fullName: "Elev", email: "-" });
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        setAccessToken(token);

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

        // Fetch modules for this course
        setModulesLoading(true);
        const modulesRes = await fetch(`/api/courses/${courseId}/modules`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          setModules(Array.isArray(modulesData) ? modulesData : []);
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca dashboard-ul cursului.");
      } finally {
        setLoading(false);
        setModulesLoading(false);
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
    : "border-cyan-400/20 bg-black text-slate-100 shadow-[0_16px_36px_rgba(34,211,238,0.12)]";

  const mutedTextClass = isLight ? "text-slate-500" : "text-slate-400";
  const headingTextClass = isLight ? "text-slate-900" : "text-slate-100";
  const viewerInitial = (viewer.fullName.trim().charAt(0) || "E").toUpperCase();
  const chatParticipants = useMemo(
    () => [
      {
        id: `student-${viewer.email}`,
        name: viewer.fullName,
        detail: "tu",
        status: "online" as const,
      },
      ...(data?.topClassStudents ?? []).slice(0, 10).map((student) => ({
        id: student.userId,
        name: student.name,
        detail: `${student.completion}% completion`,
        status: student.completion >= 70 ? ("online" as const) : student.completion >= 40 ? ("away" as const) : ("offline" as const),
      })),
    ],
    [data?.topClassStudents, viewer.email, viewer.fullName],
  );

  return (
    <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} text-neutral-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: accent.faint }} />
      </div>

      <section className={`relative grid min-h-screen w-full grid-cols-[260px_minmax(0,1fr)] ${isLight ? "bg-[#f7f9fc]/85" : "bg-black"}`}>
        <aside className={`border-r p-5 ${isLight ? "border-slate-200 bg-white/75" : "border-cyan-400/20 bg-black"}`}>
          <div className={`mb-5 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-cyan-400/20 bg-[#050505]"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-cyan-400/20 bg-black"}`}>
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
                        : "border-cyan-400/20 bg-[#050505] text-slate-300 hover:text-white"
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
              isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"
            }`}
          >
            Inapoi la cursuri
          </Link>
        </aside>

        <div className="p-6 sm:p-8">
          {loading && <div className={`rounded-2xl border p-5 text-sm ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-cyan-400/20 bg-black text-slate-300"}`}>Se incarca dashboard-ul cursului...</div>}

          {!loading && error && <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>}

          {!loading && !error && data && (
            <>
              <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Student workspace / course dashboard</p>
                  <h1 className={`text-[32px] font-bold leading-tight ${headingTextClass}`}>{data.course.title}</h1>
                  <p className={`text-sm ${mutedTextClass}`}>{data.course.level} • {data.course.visibility} • {formatHours(data.course.estimatedMins)}</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"}`}>
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
              ) : activeSection === "grup-chat" ? (
                <CourseGroupChatPanel
                  courseId={data.course.id}
                  courseTitle={data.course.title}
                  currentUserName={viewer.fullName}
                  currentUserRole="elev"
                  participants={chatParticipants}
                  isLight={isLight}
                  accentBase={accent.base}
                  accessToken={accessToken}
                />
              ) : activeSection === "module" ? (
                <div className="space-y-4">
                  <header>
                    <h2 className={`text-xl font-bold ${headingTextClass}`}>Module și Curriculum</h2>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Acces la lecții, teste, taskuri, exerciții și notele tale
                    </p>
                  </header>

                  {modulesLoading ? (
                    <div className={`rounded-2xl border p-6 ${surfaceClass} text-center`}>
                      <p className={mutedTextClass}>Se încarcă module...</p>
                    </div>
                  ) : modules.length === 0 ? (
                    <article className={`rounded-2xl border p-6 ${surfaceClass}`}>
                      <p className={`text-sm ${mutedTextClass}`}>Profesorul nu a creat module pentru acest curs încă.</p>
                    </article>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {modules.map((mod: any) => (
                        <Link key={mod.id} href={`/dashboard-elev-management/${courseId}/modules/${mod.id}`}>
                          <article className={`rounded-xl border p-4 transition hover:shadow-lg cursor-pointer ${surfaceClass}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className={`font-semibold ${headingTextClass}`}>{mod.title}</h3>
                                <p className={`mt-1 line-clamp-2 text-xs ${mutedTextClass}`}>{mod.description || 'Fără descriere'}</p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {mod.lesson_count && (
                                <span className={`rounded-full px-2 py-1 ${isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-950 text-cyan-300'}`}>
                                  📚 {mod.lesson_count} lecție{mod.lesson_count !== 1 ? 'i' : ''}
                                </span>
                              )}
                              {mod.task_count && (
                                <span className={`rounded-full px-2 py-1 ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-950 text-amber-300'}`}>
                                  ✓ {mod.task_count} task{mod.task_count !== 1 ? 'uri' : ''}
                                </span>
                              )}
                              {mod.quiz_count && (
                                <span className={`rounded-full px-2 py-1 ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950 text-emerald-300'}`}>
                                  ? {mod.quiz_count} test{mod.quiz_count !== 1 ? 'e' : ''}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 text-right">
                              <span className="text-xs font-semibold text-cyan-400">Acces module →</span>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeSection === "module" ? (
                <div className="space-y-4">
                  <header>
                    <h2 className={`text-xl font-bold ${headingTextClass}`}>Module și Curriculum</h2>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Materialele de curs, teste, taskuri și exerciții laborator create de profesor
                    </p>
                  </header>

                  <article className={`rounded-2xl border p-6 ${surfaceClass}`}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="mb-3 font-semibold">📚 Acces la:</h3>
                        <ul className={`space-y-2 text-sm ${mutedTextClass}`}>
                          <li>✓ Lecții și materiale curs</li>
                          <li>✓ Teste și quizuri evaluate</li>
                          <li>✓ Taskuri/teme de predat</li>
                          <li>✓ Calendar cu evenimente curs</li>
                          <li>✓ Exerciții laborator</li>
                          <li>✓ Notele tale la fiecare activitate</li>
                          <li>✓ Feedback de la profesor</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="mb-3 font-semibold">🎯 Cum să progresezi:</h3>
                        <ul className={`space-y-2 text-sm ${mutedTextClass}`}>
                          <li>1. Citește lecțiile și materialele</li>
                          <li>2. Completează quizurile pentru a te verifica</li>
                          <li>3. Fă taskurile și laborator</li>
                          <li>4. Verifică notele și feedback-ul</li>
                          <li>5. Revizuiește zonele slabe</li>
                          <li>6. Vorbește cu profesorul pe chat</li>
                          <li>7. Finalizează odată progresul!</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-dashed p-4 text-center">
                      <p className={`text-sm font-semibold ${headingTextClass}`}>
                        🔄 Modulele vor fi disponibile în curând
                      </p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>
                        Profesorul este în curs de setup. Întreabă-l pe chat dacă ai întrebări.
                      </p>
                    </div>
                  </article>
                </div>
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
