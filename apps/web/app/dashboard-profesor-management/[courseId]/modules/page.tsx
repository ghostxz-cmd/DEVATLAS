"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/ThemeProvider";
import ModuleCreationModal from "@/components/module/ModuleCreationModal";
import ModuleManagementDashboard from "@/components/module/ModuleManagementDashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Viewer = {
  fullName: string;
  email: string;
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  kind: string;
  cover_image_url: string | null;
  created_at?: string | null;
  metadata?: {
    minPassingScore?: number;
  } | null;
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

export default function ModulesManagementPage() {
  const params = useParams<Record<string, string | string[] | undefined>>();
  const courseId = String(params?.courseId ?? params?.courseid ?? "");
  const router = useRouter();
  const { theme, preferences } = useTheme();
  const isLight = theme === "light";
  const accent = getAccentPalette(preferences.accentColor);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>({ fullName: "Profesor", email: "-" });

  useEffect(() => {
    const load = async () => {
      try {
        if (!courseId) {
          throw new Error("Lipsește identificatorul cursului în URL.");
        }

        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session) {
          router.push(`/auth/signin?next=/dashboard-profesor-management/${courseId}/modules`);
          return;
        }

        const role = (session.user.user_metadata as any)?.role ?? null;
        if (role !== "INSTRUCTOR") {
          router.push(`/auth/signin?next=/dashboard-profesor-management/${courseId}/modules`);
          return;
        }

        setAccessToken(session.access_token);
        setViewer({
          fullName: String(session.user.user_metadata?.full_name ?? "Profesor"),
          email: String(session.user.email ?? "-"),
        });

        const response = await fetch(`/api/courses/${courseId}/modules`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Nu am putut încărca modulele.");
        }

        const payload = (await response.json()) as ModuleRow[];
        setModules(Array.isArray(payload) ? payload : []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca modulele.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [courseId, router]);

  const moduleMetrics = useMemo(() => {
    const published = modules.filter((item) => item.visibility === "PUBLISHED").length;
    const values = modules
      .map((item) => Number(item?.metadata?.minPassingScore ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    return {
      published,
      avgPassingScore: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      total: modules.length,
    };
  }, [modules]);

  const moduleChart = useMemo(() => {
    const totals = new Map<string, number>();
    modules.forEach((item) => {
      const date = item.created_at ? new Date(item.created_at) : new Date();
      const key = date.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
      totals.set(key, (totals.get(key) ?? 0) + 1);
    });

    return Array.from(totals.entries()).slice(-7).map(([label, value], index) => ({
      key: `${label}-${index}`,
      label,
      value,
    }));
  }, [modules]);

  const maxChart = Math.max(...moduleChart.map((item) => item.value), 1);
  const viewerInitial = (viewer.fullName.trim().charAt(0) || "P").toUpperCase();
  const headingTextClass = isLight ? "text-slate-900" : "text-slate-100";
  const mutedTextClass = isLight ? "text-slate-500" : "text-slate-400";
  const surfaceClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
    : "border-cyan-400/20 bg-black text-slate-100 shadow-[0_16px_36px_rgba(34,211,238,0.12)]";

  if (loading) {
    return (
      <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} text-neutral-900`}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className={`rounded-2xl border px-6 py-4 ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-cyan-400/20 bg-black text-slate-300"}`}>
            Se încarcă dashboard-ul de module...
          </div>
        </div>
      </main>
    );
  }

  if (selectedModule) {
    return (
      <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} text-neutral-900`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: accent.faint }} />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: isLight ? "rgba(15, 23, 42, 0.06)" : "rgba(148, 163, 184, 0.06)" }} />
        </div>

        <section className={`relative grid min-h-screen w-full grid-cols-[260px_minmax(0,1fr)] ${isLight ? "bg-[#f7f9fc]/85" : "bg-black"}`}>
          <aside className={`border-r p-5 ${isLight ? "border-slate-200 bg-white/75" : "border-cyan-400/20 bg-black"}`}>
            <div className={`mb-5 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-cyan-400/20 bg-[#050505]"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-cyan-400/20 bg-black"}`}>
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
                <div className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${isLight ? "text-slate-900" : "text-white"}`} style={{ background: isLight ? accent.soft : accent.base }}>
                  {viewerInitial}
                </div>
              </div>
            </div>

            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>Course Admin</p>
            <h2 className={`mt-1 text-xl font-bold ${headingTextClass}`}>Management module</h2>

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
              href={`/dashboard-profesor-management/${courseId}`}
              className={`mt-8 inline-flex rounded-xl border px-3.5 py-2 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"}`}
            >
              Înapoi la curs
            </Link>
          </aside>

          <div className="p-6 sm:p-8">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-xs ${mutedTextClass}`}>Course workspace / dashboard</p>
                <h1 className={`text-[32px] font-bold leading-tight ${headingTextClass}`}>Gestionare Module și Curs</h1>
                <p className={`text-sm ${mutedTextClass}`}>Structura avansată pentru module, curriculum, evaluări și laborator.</p>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"}`}
              >
                Înapoi la module
              </button>
            </header>

            <ModuleManagementDashboard moduleId={selectedModule} courseId={courseId} accessToken={accessToken ?? undefined} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} text-neutral-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: accent.faint }} />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: isLight ? "rgba(15, 23, 42, 0.06)" : "rgba(148, 163, 184, 0.06)" }} />
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

          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>Course Admin</p>
          <h2 className={`mt-1 text-xl font-bold ${headingTextClass}`}>Management module</h2>

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
            href={`/dashboard-profesor-management/${courseId}`}
            className={`mt-8 inline-flex rounded-xl border px-3.5 py-2 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"}`}
          >
            Înapoi la curs
          </Link>
        </aside>

        <div className="p-6 sm:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs ${mutedTextClass}`}>Course workspace / dashboard</p>
              <h1 className={`text-[32px] font-bold leading-tight ${headingTextClass}`}>Gestionare Module și Curs</h1>
              <p className={`text-sm ${mutedTextClass}`}>Structura avansată pentru module, curriculum, evaluări și laborator.</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#050505] text-slate-200"}`}>
              Updated {new Date().toLocaleDateString("ro-RO")}
            </div>
          </header>

          {error && <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>}

          {activeSection === "general" ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Module totale</p>
                  <p className="mt-2 text-3xl font-bold">{moduleMetrics.total}</p>
                  <p className="mt-1 text-xs" style={{ color: accent.base }}>{moduleMetrics.published} publicate</p>
                </article>

                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Module publicate</p>
                  <p className="mt-2 text-3xl font-bold">{moduleMetrics.published}</p>
                  <p className={`mt-1 text-xs ${mutedTextClass}`}>din {moduleMetrics.total} totale</p>
                </article>

                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Prag mediu</p>
                  <p className="mt-2 text-3xl font-bold">{moduleMetrics.avgPassingScore}%</p>
                  <p className="mt-1 text-xs" style={{ color: accent.base }}>setat în module</p>
                </article>

                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <p className={`text-xs uppercase tracking-[0.12em] ${mutedTextClass}`}>Stare</p>
                  <p className="mt-2 text-3xl font-bold">{modules.length > 0 ? "OK" : "0"}</p>
                  <p className={`mt-1 text-xs ${mutedTextClass}`}>dashboard pregătit</p>
                </article>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <h3 className="text-sm font-semibold">Module create recent</h3>
                  <div className="mt-3 flex h-40 items-end gap-2">
                    {moduleChart.map((item) => (
                      <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-t-md" style={{ background: accent.base, opacity: 0.9, height: `${Math.max(8, (item.value / maxChart) * 120)}px` }} />
                        <span className={`text-[10px] ${mutedTextClass}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <h3 className="text-sm font-semibold">Module active</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                      <span className={mutedTextClass}>Total active</span>
                      <span className="font-semibold" style={{ color: accent.base }}>{moduleMetrics.published}</span>
                    </div>
                    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                      <span className={mutedTextClass}>Media prag</span>
                      <span className="font-semibold">{moduleMetrics.avgPassingScore}%</span>
                    </div>
                    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f1a31]"}`}>
                      <span className={mutedTextClass}>Total</span>
                      <span className="font-semibold">{moduleMetrics.total}</span>
                    </div>
                  </div>
                </article>

                <article className={`rounded-2xl border p-4 ${surfaceClass}`}>
                  <h3 className="text-sm font-semibold">Acțiuni</h3>
                  <p className={`mt-3 text-sm ${mutedTextClass}`}>Creează module noi sau deschide un modul existent pentru curriculum, calendar, note și testare.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                    style={{ backgroundColor: accent.base }}
                  >
                    + Creare Modul Nou
                  </button>
                </article>
              </div>

              {modules.length === 0 ? (
                <div className={`mt-4 rounded-2xl border p-6 text-center ${surfaceClass}`}>
                  <p className={`text-lg font-bold ${headingTextClass}`}>Niciun modul creat încă</p>
                  <p className={`mt-2 ${mutedTextClass}`}>Creează primul modul pentru a porni structura avansată de curs.</p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {modules.map((module) => {
                    const minPassing = Number(module?.metadata?.minPassingScore ?? 60);
                    return (
                      <button
                        key={module.id}
                        onClick={() => setSelectedModule(module.id)}
                        className={`group overflow-hidden rounded-3xl border text-left transition ${surfaceClass}`}
                        style={{ boxShadow: isLight ? "0 10px 28px rgba(15,23,42,0.08)" : "0 18px 40px rgba(2,6,23,0.45)" }}
                      >
                        <div className="relative h-40 overflow-hidden">
                          {module.cover_image_url ? (
                            <img src={module.cover_image_url} alt={module.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                          ) : (
                            <div
                              className="h-full w-full"
                              style={{
                                background: `linear-gradient(135deg, ${accent.soft}, transparent 70%), linear-gradient(120deg, #0f172a, #111827)`,
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                          <div className="absolute left-4 top-4">
                            <span className="rounded-full border px-3 py-1 text-[11px] font-semibold text-white backdrop-blur" style={{ borderColor: accent.base, backgroundColor: accent.faint }}>
                              {module.kind === 'MODULE' ? 'Modul' : 'Folder'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 p-5">
                          <h3 className={`line-clamp-1 text-lg font-bold ${headingTextClass}`}>{module.title}</h3>
                          <p className={`line-clamp-2 text-sm ${mutedTextClass}`}>{module.description || 'Fără descriere momentan.'}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className={mutedTextClass}>Prag minim: {minPassing}%</span>
                            <span style={{ color: accent.base }} className="font-semibold">Deschide →</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : activeSection === "module" ? (
            <div className={`rounded-2xl border p-6 ${surfaceClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-bold ${headingTextClass}`}>Gestionare Module</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Deschide un modul pentru curriculum, calendar, teste, taskuri și note.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                  style={{ backgroundColor: accent.base }}
                >
                  + Creare Modul Nou
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module.id)}
                    className={`rounded-2xl border p-4 text-left transition ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0f1a31]'}`}
                  >
                    <p className={`text-sm font-semibold ${headingTextClass}`}>{module.title}</p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>{module.description || 'Fără descriere momentan.'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${isLight ? 'border-slate-300 bg-white' : 'border-white/20 bg-[#0b1220]'}`}>
              <h3 className={`text-lg font-bold ${headingTextClass}`}>{sections.find((item) => item.key === activeSection)?.label}</h3>
              <p className={`mt-2 text-sm ${mutedTextClass}`}>Secțiune disponibilă în dashboard-ul complet al modulului.</p>
            </div>
          )}
        </div>
      </section>

      <ModuleCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onModuleCreated={(newModule) => {
          setModules((previous) => [...previous, newModule]);
          setShowCreateModal(false);
        }}
        courseId={courseId}
        accessToken={accessToken ?? undefined}
      />
    </main>
  );
}
