'use client';

import { useEffect, useMemo, useState } from 'react';

interface GradesViewProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

type GradeRow = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  gradeId: string | null;
  gradePercentage: number | null;
  gradeLetter: string | null;
  finalScore: number | null;
  feedback: string | null;
  updatedAt: string | null;
};

export default function GradesView({ moduleId, courseId, accessToken }: GradesViewProps) {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [error, setError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formData, setFormData] = useState({
    gradePercentage: 0,
    gradeLetter: '',
    finalScore: 0,
    feedback: '',
  });

  useEffect(() => {
    const loadGrades = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/grades?moduleId=${encodeURIComponent(moduleId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Nu am putut incarca notele.');
        }

        const data = await response.json();
        const rows = Array.isArray(data) ? data : [];
        setGrades(rows);
        if (!selectedStudentId && rows.length > 0) {
          setSelectedStudentId(rows[0].studentId);
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Eroare la incarcare.');
      } finally {
        setLoading(false);
      }
    };

    void loadGrades();
  }, [courseId, moduleId, accessToken]);

  const summary = useMemo(() => {
    const validScores = grades.map((grade) => Number(grade.gradePercentage)).filter((value) => Number.isFinite(value));
    const average = validScores.length > 0 ? validScores.reduce((sum, value) => sum + value, 0) / validScores.length : 0;
    const passed = validScores.filter((value) => value >= 50).length;
    return {
      average: Math.round(average * 10) / 10,
      passed,
      total: grades.length,
    };
  }, [grades]);

  const handleSaveGrade = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/courses/${courseId}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          gradePercentage: Number(formData.gradePercentage),
          gradeLetter: formData.gradeLetter,
          finalScore: Number(formData.finalScore),
          feedback: formData.feedback,
          moduleId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Nu am putut salva nota.');
      }

      const saved = await response.json();
      setGrades((previous) => {
        const filtered = previous.filter((grade) => grade.studentId !== saved.student_id);
        return [
          {
            studentId: saved.student_id,
            studentName: saved.student_name ?? previous.find((grade) => grade.studentId === saved.student_id)?.studentName ?? 'Student',
            studentEmail: saved.student_email ?? previous.find((grade) => grade.studentId === saved.student_id)?.studentEmail ?? '-',
            gradeId: saved.id ?? null,
            gradePercentage: saved.grade_percentage ?? null,
            gradeLetter: saved.grade_letter ?? null,
            finalScore: saved.final_score ?? null,
            feedback: saved.feedback ?? null,
            updatedAt: saved.updated_at ?? new Date().toISOString(),
          },
          ...filtered,
        ];
      });
      setFormData({
        gradePercentage: 0,
        gradeLetter: '',
        finalScore: 0,
        feedback: '',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Eroare la salvare.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Catalog și Note</h2>
          <p className="text-sm text-slate-400">Media modulului: {summary.average || 0} | Promovați: {summary.passed}</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Medie Modul</p>
          <p className="mt-2 text-3xl font-bold text-white">{summary.average || 0}</p>
        </div>
        <div className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Promovați</p>
          <p className="mt-2 text-3xl font-bold text-white">{summary.passed}</p>
        </div>
        <div className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Total elevi</p>
          <p className="mt-2 text-3xl font-bold text-white">{summary.total}</p>
        </div>
      </div>

      <form onSubmit={handleSaveGrade} className="space-y-3 rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            required
          >
            <option value="">Alege studentul</option>
            {grades.map((grade) => (
              <option key={grade.studentId} value={grade.studentId}>
                {grade.studentName} ({grade.studentEmail})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={formData.gradeLetter}
            onChange={(e) => setFormData({ ...formData, gradeLetter: e.target.value })}
            placeholder="Litera notei"
            className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="number"
            value={formData.gradePercentage}
            onChange={(e) => setFormData({ ...formData, gradePercentage: Number(e.target.value) })}
            placeholder="Procent"
            className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            min={0}
            max={100}
          />
          <input
            type="number"
            value={formData.finalScore}
            onChange={(e) => setFormData({ ...formData, finalScore: Number(e.target.value) })}
            placeholder="Scor final"
            className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
          />
        </div>
        <textarea
          value={formData.feedback}
          onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
          placeholder="Feedback"
          className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
          rows={3}
        />
        <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">Salvează nota</button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-slate-400">Se încarcă notele...</p>
        ) : grades.length === 0 ? (
          <p className="text-slate-400">Nu există note în acest modul.</p>
        ) : (
          grades.map((grade) => (
            <article key={grade.studentId} className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{grade.studentName}</h3>
                  <p className="text-xs text-slate-400">{grade.studentEmail}</p>
                </div>
                <span className="text-xs text-cyan-300">{grade.gradePercentage ?? 0}%</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{grade.feedback || 'Fără feedback'}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
