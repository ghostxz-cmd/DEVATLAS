"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/ThemeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SlideBlock = {
  id: string;
  title: string;
  body: string;
  accent: string;
};

function getAccentPalette(accent: "cyan" | "emerald" | "amber" | "rose" | "violet") {
  const palette = {
    cyan: { base: "#22d3ee", soft: "rgba(34, 211, 238, 0.18)", faint: "rgba(34, 211, 238, 0.08)" },
    emerald: { base: "#22c55e", soft: "rgba(34, 197, 94, 0.18)", faint: "rgba(34, 197, 94, 0.08)" },
    amber: { base: "#f59e0b", soft: "rgba(245, 158, 11, 0.18)", faint: "rgba(245, 158, 11, 0.08)" },
    rose: { base: "#f43f5e", soft: "rgba(244, 63, 94, 0.18)", faint: "rgba(244, 63, 94, 0.08)" },
    violet: { base: "#8b5cf6", soft: "rgba(139, 92, 246, 0.18)", faint: "rgba(139, 92, 246, 0.08)" },
  };

  return palette[accent];
}

export default function LessonStudioPage() {
  const params = useParams<Record<string, string | string[] | undefined>>();
  const courseId = String(params?.courseId ?? params?.courseid ?? "");
  const moduleId = String(params?.moduleId ?? params?.moduleid ?? "");
  const router = useRouter();
  const { theme, preferences } = useTheme();
  const isLight = theme === "light";
  const accent = getAccentPalette(preferences.accentColor);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("Modul");
  const [activeSlideId, setActiveSlideId] = useState<string>("slide-1");
  const [slides, setSlides] = useState<SlideBlock[]>([
    { id: "slide-1", title: "Titlul lecției", body: "Introducere și obiectivele principale.", accent: "cyan" },
    { id: "slide-2", title: "Conceptul central", body: "Notează ideile, exemplele și explicațiile vizuale.", accent: "emerald" },
    { id: "slide-3", title: "Aplicație practică", body: "Exerciții, temă sau mini-proiect de consolidare.", accent: "amber" },
  ]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lessonType: "MATERIAL",
    estimatedDurationMinutes: 45,
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (!courseId || !moduleId) {
          throw new Error("Lipsește cursul sau modulul din URL.");
        }

        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session) {
          router.push(`/auth/signin?next=/dashboard-profesor-management/${courseId}/modules/${moduleId}/lessons/new`);
          return;
        }

        const response = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const module = await response.json();
          setModuleTitle(String(module?.title ?? "Modul"));
          if (module?.description) {
            setFormData((current) => ({ ...current, description: String(module.description) }));
          }
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca editorul lecției.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [courseId, moduleId, router]);

  const activeSlide = useMemo(() => slides.find((slide) => slide.id === activeSlideId) ?? slides[0], [activeSlideId, slides]);

  const htmlPreview = useMemo(
    () => slides.map((slide) => `\n            <section>\n              <h2>${slide.title}</h2>\n              <p>${slide.body}</p>\n            </section>\n          `).join(""),
    [slides],
  );

  const updateSlide = (slideId: string, patch: Partial<SlideBlock>) => {
    setSlides((previous) => previous.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        throw new Error("Nu există sesiune activă.");
      }

      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          lessonType: formData.lessonType,
          content: JSON.stringify(slides),
          contentHtml: htmlPreview,
          estimatedDurationMinutes: formData.estimatedDurationMinutes,
          moduleId,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Nu am putut salva lecția.");
      }

      router.push(`/dashboard-profesor-management/${courseId}/modules`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nu am putut salva lecția.");
    } finally {
      setSaving(false);
    }
  };

  const surfaceClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
    : "border-cyan-400/20 bg-black text-slate-100 shadow-[0_18px_40px_rgba(34,211,238,0.12)]";

  if (loading) {
    return <main className={`min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} p-6 text-white`}>Se încarcă editorul lecției...</main>;
  }

  return (
    <main className={`relative min-h-screen ${isLight ? "bg-[#eaf0f8]" : "bg-black"} text-neutral-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: accent.faint }} />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: isLight ? "rgba(15, 23, 42, 0.06)" : "rgba(148, 163, 184, 0.06)" }} />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border px-5 py-4 ${surfaceClass}`}>
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Lesson Studio</p>
            <h1 className={`mt-1 text-2xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>{moduleTitle}</h1>
            <p className={`mt-1 text-sm ${isLight ? "text-slate-600" : "text-slate-300"}`}>Editor avansat pentru lecții, materiale și prezentări.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard-profesor-management/${courseId}/modules`}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-cyan-400/20 bg-[#070b14] text-slate-200"}`}
            >
              Înapoi la module
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !formData.title.trim()}
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: accent.base }}
            >
              {saving ? "Se salvează..." : "Salvează lecția"}
            </button>
          </div>
        </header>

        {error && <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1.35fr)_360px]">
          <aside className={`rounded-[28px] border p-4 ${surfaceClass}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Slides</p>
            <div className="mt-4 space-y-3">
              {slides.map((slide, index) => {
                const active = slide.id === activeSlideId;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlideId(slide.id)}
                    className={`w-full rounded-[22px] border p-3 text-left transition ${active ? "text-black" : isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-[#070b14] text-slate-300"}`}
                    style={active ? { backgroundColor: accent.base, borderColor: accent.base } : undefined}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Slide {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{slide.title}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`min-h-[760px] rounded-[34px] border p-5 ${surfaceClass}`}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Canvas</p>
                <h2 className={`mt-1 text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Prezentare de tip PowerPoint</h2>
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">{slides.length} slide-uri</div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="rounded-[30px] border border-white/10 bg-[#050816] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                <div className="min-h-[520px] rounded-[26px] border border-white/10 bg-gradient-to-br from-[#08111f] via-[#050816] to-[#020308] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">{moduleTitle}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <input
                      value={formData.title}
                      onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Titlul lecției"
                      className="w-full border-0 bg-transparent text-3xl font-black text-white outline-none placeholder:text-white/30"
                    />
                    <select
                      value={formData.lessonType}
                      onChange={(event) => setFormData((current) => ({ ...current, lessonType: event.target.value }))}
                      className="rounded-2xl border border-cyan-400/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="MATERIAL">MATERIAL</option>
                      <option value="VIDEO">VIDEO</option>
                      <option value="INTERACTIVE">INTERACTIVE</option>
                      <option value="READING">READING</option>
                    </select>
                  </div>

                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Descriere scurtă a lecției"
                    className="mt-5 w-full resize-none border-0 bg-transparent text-slate-300 outline-none placeholder:text-slate-500"
                    rows={3}
                  />

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-[24px] border border-cyan-400/20 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Obiectiv</p>
                      <textarea
                        value={activeSlide.body}
                        onChange={(event) => updateSlide(activeSlide.id, { body: event.target.value })}
                        className="mt-2 w-full resize-none border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        rows={5}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={activeSlide.title}
                        onChange={(event) => updateSlide(activeSlide.id, { title: event.target.value })}
                        className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                        placeholder="Titlu slide"
                      />
                      <select
                        value={activeSlide.accent}
                        onChange={(event) => updateSlide(activeSlide.id, { accent: event.target.value })}
                        className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="cyan">Cyan</option>
                        <option value="emerald">Emerald</option>
                        <option value="amber">Amber</option>
                        <option value="rose">Rose</option>
                        <option value="violet">Violet</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[30px] border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Preview</p>
                  <div className="mt-3 rounded-[24px] border border-cyan-400/20 bg-[#070b14] p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">Slide activ</p>
                    <h3 className="mt-2 text-2xl font-black">{activeSlide.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{activeSlide.body}</p>
                    <div className="mt-5 h-40 rounded-[20px] border border-dashed border-cyan-400/20" style={{ background: accent.soft }} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block">
                    <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Durată</span>
                    <input
                      type="number"
                      min={1}
                      value={formData.estimatedDurationMinutes}
                      onChange={(event) => setFormData((current) => ({ ...current, estimatedDurationMinutes: Number(event.target.value) }))}
                      className={`mt-2 w-full rounded-[20px] border px-4 py-3 text-sm outline-none ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#070b14] text-white"}`}
                    />
                  </label>
                  <div className="rounded-[24px] border border-cyan-400/20 bg-[#070b14] p-4 text-sm text-slate-300">
                    Lecția va fi salvată cu slide-urile curente în conținut și cu un preview HTML în stil prezentare.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSlides((previous) => [...previous, { id: `slide-${previous.length + 1}`, title: 'Slide nou', body: 'Conținut nou', accent: 'cyan' }])}
                  className="w-full rounded-[22px] border border-cyan-400/20 bg-[#070b14] px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/10"
                >
                  + Adaugă slide
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}