'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/app/ThemeProvider';
import LessonEditor from './tabs/LessonEditor';
import QuizBuilder from './tabs/QuizBuilder';
import TaskManager from './tabs/TaskManager';
import CalendarView from './tabs/CalendarView';
import LaboratorManager from './tabs/LaboratorManager';
import GradesView from './tabs/GradesView';

interface ModuleManagementDashboardProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

type TabType = 'curriculum' | 'calendar' | 'quizzes' | 'tasks' | 'laborator' | 'grades';

export default function ModuleManagementDashboard({
  moduleId,
  courseId,
  accessToken,
}: ModuleManagementDashboardProps) {
  const { theme, preferences } = useTheme();
  const isLight = theme === 'light';
  const accentMap = {
    cyan: { base: '#22d3ee', soft: 'rgba(34, 211, 238, 0.2)', faint: 'rgba(34, 211, 238, 0.08)' },
    emerald: { base: '#22c55e', soft: 'rgba(34, 197, 94, 0.2)', faint: 'rgba(34, 197, 94, 0.08)' },
    amber: { base: '#f59e0b', soft: 'rgba(245, 158, 11, 0.2)', faint: 'rgba(245, 158, 11, 0.08)' },
    rose: { base: '#f43f5e', soft: 'rgba(244, 63, 94, 0.2)', faint: 'rgba(244, 63, 94, 0.08)' },
    violet: { base: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.2)', faint: 'rgba(139, 92, 246, 0.08)' },
  } as const;
  const accent = accentMap[preferences.accentColor];

  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch module');
        const data = await res.json();
        setModule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching module');
      } finally {
        setLoading(false);
      }
    };

    fetchModule();
  }, [moduleId, courseId, accessToken]);

  if (loading) {
    return <div className={`rounded-2xl border p-6 text-center ${isLight ? 'border-slate-200 bg-white text-slate-600' : 'border-white/10 bg-[#0b1220] text-slate-300'}`}>Se incarca modulul...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">{error}</div>;
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'curriculum', label: 'Curriculum', icon: '📚' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'quizzes', label: 'Teste', icon: '✍️' },
    { id: 'tasks', label: 'Taskuri', icon: '📋' },
    { id: 'laborator', label: 'Laborator', icon: '🔬' },
    { id: 'grades', label: 'Note', icon: '📊' },
  ];

  return (
    <div className="h-full space-y-4">
      <div className={`rounded-3xl border p-6 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1220]'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Studio modul</p>
            <h1 className={`mt-1 text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{module?.title}</h1>
            <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{module?.description || 'Fara descriere.'}</p>
          </div>
          {module?.cover_image_url && (
            <img
              src={module.cover_image_url}
              alt={module.title}
              className="h-24 w-24 rounded-2xl object-cover"
            />
          )}
        </div>
      </div>

      <div className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1220]'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 transition ${
              activeTab === tab.id
                ? 'text-slate-900'
                : isLight
                  ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'border border-white/10 text-slate-300 hover:bg-white/5'
            }`}
            style={
              activeTab === tab.id
                ? { backgroundColor: accent.base }
                : undefined
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`rounded-3xl border p-6 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b1220]'}`}>
        {activeTab === 'curriculum' && (
          <LessonEditor moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
        {activeTab === 'quizzes' && (
          <QuizBuilder moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
        {activeTab === 'tasks' && (
          <TaskManager moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
        {activeTab === 'laborator' && (
          <LaboratorManager moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
        {activeTab === 'grades' && (
          <GradesView moduleId={moduleId} courseId={courseId} accessToken={accessToken} />
        )}
      </div>
    </div>
  );
}
