'use client';

import { useState } from 'react';
import { useTheme } from '@/app/ThemeProvider';

interface ModuleCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleCreated: (module: any) => void;
  courseId: string;
  accessToken?: string;
}

export default function ModuleCreationModal({
  isOpen,
  onClose,
  onModuleCreated,
  courseId,
  accessToken,
}: ModuleCreationModalProps) {
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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImageUrl: '',
    minPassingScore: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Eroare la crearea modulului');
      }

      const newModule = await res.json();
      onModuleCreated(newModule);
      setFormData({
        title: '',
        description: '',
        coverImageUrl: '',
        minPassingScore: 60,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare necunoscuta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-3xl border p-6 md:p-7 ${isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#060d1f] text-white'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={`text-xs uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Module studio</p>
            <h2 className="mt-1 text-2xl font-bold">Creare Modul Nou</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}
          >
            Inchide
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Titlu</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 outline-none transition ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-slate-400' : 'border-white/15 bg-[#070b14] text-white focus:border-white/30'}`}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Descriere</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 outline-none transition ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-slate-400' : 'border-white/15 bg-[#070b14] text-white focus:border-white/30'}`}
              rows={4}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>URL Poza Coperta</label>
            <input
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 outline-none transition ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-slate-400' : 'border-white/15 bg-[#070b14] text-white focus:border-white/30'}`}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Medie Minima de Trecere (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minPassingScore}
              onChange={(e) =>
                setFormData({ ...formData, minPassingScore: parseInt(e.target.value) })
              }
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 outline-none transition ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-slate-400' : 'border-white/15 bg-[#070b14] text-white focus:border-white/30'}`}
            />
          </div>

          <div className="flex gap-3 pt-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition"
              style={{ borderColor: accent.base, color: accent.base, background: accent.faint }}
            >
              Anulare
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: accent.base }}
            >
              {loading ? 'Se creeaza...' : 'Creare Modul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
