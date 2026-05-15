'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface LessonEditorProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  lesson_type: string | null;
  estimated_duration_minutes: number | null;
  created_at: string | null;
};

export default function LessonEditor({ moduleId, courseId, accessToken }: LessonEditorProps) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLessons = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/lessons?moduleId=${encodeURIComponent(moduleId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Failed to load lessons');
        }

        const data = await res.json();
        setLessons(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading lessons');
      } finally {
        setLoading(false);
      }
    };

    void loadLessons();
  }, [courseId, moduleId, accessToken]);

  const stats = useMemo(() => ({
    total: lessons.length,
    videos: lessons.filter((lesson) => lesson.lesson_type === 'VIDEO').length,
    interactive: lessons.filter((lesson) => lesson.lesson_type === 'INTERACTIVE').length,
  }), [lessons]);

  const newestLesson = lessons[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-[#050816] via-[#07111f] to-[#04070e] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Curriculum Studio</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Lecții și materiale în format avansat</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Creezi lecții într-o pagină separată, cu aspect de prezentare, astfel încât să poți construi conținutul exact ca un deck de PowerPoint, dar păstrând identitatea vizuală DevAtlas.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/dashboard-profesor-management/${courseId}/modules/${moduleId}/lessons/new`}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              style={{ backgroundColor: '#22d3ee' }}
            >
              + Deschide editorul de lecție
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {moduleId ? 'Editor conectat la modulul curent' : 'Selectează mai întâi un modul'}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <article className="rounded-[24px] border border-cyan-400/20 bg-[#070b14] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total lecții</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.total}</p>
          </article>
          <article className="rounded-[24px] border border-cyan-400/20 bg-[#070b14] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Video</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.videos}</p>
          </article>
          <article className="rounded-[24px] border border-cyan-400/20 bg-[#070b14] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Interactiv</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.interactive}</p>
          </article>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-[28px] border border-cyan-400/20 bg-[#050816] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200/70">Deck de lecții</h3>
              <p className="mt-1 text-sm text-slate-400">Aici vezi lecțiile care sunt deja legate de modulul curent.</p>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-400">Se încarcă lecțiile...</p>
          ) : lessons.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-cyan-400/20 bg-white/5 p-8 text-center text-slate-300">
              <p className="text-lg font-bold text-white">Nicio lecție adăugată încă</p>
              <p className="mt-2 text-sm text-slate-400">Deschide editorul avansat și creează prima lecție ca pe un slide deck.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {lessons.map((lesson, index) => (
                <article key={lesson.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Slide {index + 1}</p>
                      <h4 className="mt-1 text-lg font-bold text-white">{lesson.title}</h4>
                    </div>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                      {lesson.lesson_type || 'MATERIAL'}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                    {lesson.description || 'Fără descriere momentan.'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-white/5 px-3 py-1">Durată: {lesson.estimated_duration_minutes ?? 0} min</span>
                    {lesson.created_at && <span className="rounded-full bg-white/5 px-3 py-1">Creată {new Date(lesson.created_at).toLocaleDateString('ro-RO')}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-[28px] border border-cyan-400/20 bg-[#070b14] p-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200/70">Ultima lecție</h3>
            <p className="mt-1 text-sm text-slate-400">Panou rapid pentru ce s-a creat cel mai recent.</p>
          </div>

          {newestLesson ? (
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{newestLesson.lesson_type || 'MATERIAL'}</p>
              <h4 className="mt-2 text-xl font-bold text-white">{newestLesson.title}</h4>
              <p className="mt-2 text-sm text-slate-300">{newestLesson.description || 'Fără descriere momentan.'}</p>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              Nu există încă o lecție recentă.
            </div>
          )}

          <Link
            href={`/dashboard-profesor-management/${courseId}/modules/${moduleId}/lessons/new`}
            className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            style={{ backgroundColor: '#22d3ee' }}
          >
            Creează lecție nouă
          </Link>
        </aside>
      </div>
    </div>
  );
}
