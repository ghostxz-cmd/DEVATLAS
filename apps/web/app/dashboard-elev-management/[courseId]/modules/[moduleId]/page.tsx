'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/app/ThemeProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import LessonEditor from '@/components/module/tabs/LessonEditor';
import CalendarView from '@/components/module/tabs/CalendarView';
import QuizBuilder from '@/components/module/tabs/QuizBuilder';
import GradesView from '@/components/module/tabs/GradesView';

type ModuleView = {
  id: string;
  title: string;
  description: string | null;
};

type TabKey = 'lessons' | 'calendar' | 'quizzes' | 'grades';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'lessons', label: '📚 Lecții' },
  { key: 'calendar', label: '📅 Calendar' },
  { key: 'quizzes', label: '? Teste' },
  { key: 'grades', label: '⭐ Notele mele' },
];

export default function StudentModuleViewPage() {
  const params = useParams<{ courseId: string; moduleId: string }>();
  const router = useRouter();
  const courseId = String(params?.courseId ?? '');
  const moduleId = String(params?.moduleId ?? '');

  const { theme, preferences } = useTheme();
  const isLight = theme === 'light';
  const accentColor = preferences.accentColor || 'cyan';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState<ModuleView | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('lessons');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;
        setAccessToken(token);

        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Nu am putut încărca modulul');
        }

        const data = await res.json();
        setModule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Eroare la încărcare');
      } finally {
        setLoading(false);
      }
    };

    if (courseId && moduleId) {
      load();
    }
  }, [courseId, moduleId]);

  if (loading) {
    return (
      <main className={`min-h-screen ${isLight ? 'bg-[#eaf0f8]' : 'bg-black'}`}>
        <div className="flex items-center justify-center p-4 py-20">
          <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>Se încarcă...</p>
        </div>
      </main>
    );
  }

  if (error || !module) {
    return (
      <main className={`min-h-screen ${isLight ? 'bg-[#eaf0f8]' : 'bg-black'}`}>
        <div className="flex flex-col items-center justify-center p-4 py-20">
          <p className={isLight ? 'text-red-600' : 'text-red-400'}>{error || 'Modulul nu a fost găsit'}</p>
          <button onClick={() => router.back()} className="mt-4 text-cyan-400">
            ← Înapoi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${isLight ? 'bg-[#eaf0f8]' : 'bg-black'}`}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <button onClick={() => router.back()} className={`text-sm ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>
            ← Înapoi
          </button>
          <h1 className={`mt-2 text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{module.title}</h1>
          {module.description && (
            <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{module.description}</p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className={`mb-6 flex gap-2 rounded-lg border ${isLight ? 'border-slate-200 bg-white' : 'border-cyan-400/20 bg-[#070b14]'} p-2`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? accentColor === 'cyan'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-emerald-500 text-white'
                  : isLight
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`rounded-lg border ${isLight ? 'border-slate-200 bg-white p-6' : 'border-cyan-400/20 bg-[#070b14] p-6'}`}>
          {activeTab === 'lessons' && <LessonEditor moduleId={moduleId} courseId={courseId} accessToken={accessToken} />}
          {activeTab === 'calendar' && <CalendarView moduleId={moduleId} courseId={courseId} accessToken={accessToken} />}
          {activeTab === 'quizzes' && <QuizBuilder moduleId={moduleId} courseId={courseId} accessToken={accessToken} />}
          {activeTab === 'grades' && <GradesView moduleId={moduleId} courseId={courseId} accessToken={accessToken} />}
        </div>
      </div>
    </main>
  );
}
