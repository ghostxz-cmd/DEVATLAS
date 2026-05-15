'use client';

import { useEffect, useState } from 'react';

interface QuizBuilderProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

export default function QuizBuilder({ moduleId, courseId, accessToken }: QuizBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [managingQuizId, setManagingQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionForm, setQuestionForm] = useState({
    question_type: 'MULTIPLE_CHOICE',
    question_text: '',
    options: ['',''],
    correct_answer: '',
    points: 1,
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    passingScorePercentage: 60,
    timeLimitMinutes: 30,
    allowRetake: true,
    maxAttempts: 3,
  });

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/quizzes?moduleId=${encodeURIComponent(moduleId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Nu am putut incarca testele.');
        const data = await res.json();
        setQuizzes(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Eroare la incarcare.');
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [courseId, moduleId, accessToken]);

  const handleCreateQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          moduleId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Nu am putut crea testul.');
      }

      const created = await res.json();
      setQuizzes((previous) => [created, ...previous]);
      setOpenForm(false);
      setFormData({
        title: '',
        description: '',
        instructions: '',
        passingScorePercentage: 60,
        timeLimitMinutes: 30,
        allowRetake: true,
        maxAttempts: 3,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la creare.');
    }
  };

  const fetchQuestions = async (quizId: string) => {
    setQuestions([]);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/questions`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Nu am putut incarca intrebarile.');
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
      setManagingQuizId(quizId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcare.');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingQuizId) return;
    try {
      const payload: any = {
        question_type: questionForm.question_type,
        question_text: questionForm.question_text,
        options: questionForm.question_type === 'MULTIPLE_CHOICE' ? questionForm.options.filter((o) => o.trim() !== '') : undefined,
        correct_answer: questionForm.correct_answer || null,
        points: questionForm.points,
      };

      const res = await fetch(`/api/courses/${courseId}/quizzes/${managingQuizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Nu am putut crea intrebare.');
      }

      const created = await res.json();
      setQuestions((prev) => [created, ...prev]);
      setQuestionForm({ question_type: 'MULTIPLE_CHOICE', question_text: '', options: ['',''], correct_answer: '', points: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la creare intrebare');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Creare Teste și Quizuri</h2>
        <button
          onClick={() => setOpenForm((value) => !value)}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-white transition hover:bg-cyan-600"
        >
          + Creare Test
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {openForm && (
        <form onSubmit={handleCreateQuiz} className="space-y-3 rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Titlu test"
            className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            required
          />
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descriere"
            className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            rows={2}
          />
          <textarea
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Instructiuni"
            className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            rows={3}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="number"
              value={formData.passingScorePercentage}
              onChange={(e) => setFormData({ ...formData, passingScorePercentage: Number(e.target.value) })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              min={0}
              max={100}
            />
            <input
              type="number"
              value={formData.timeLimitMinutes}
              onChange={(e) => setFormData({ ...formData, timeLimitMinutes: Number(e.target.value) })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              min={0}
            />
            <input
              type="number"
              value={formData.maxAttempts}
              onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              min={1}
            />
          </div>
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">Salveaza test</button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-slate-400">Se incarca testele...</p>
        ) : quizzes.length === 0 ? (
          <p className="text-slate-400">Nu exista teste in acest modul.</p>
        ) : (
          quizzes.map((quiz) => (
            <article key={quiz.id} className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{quiz.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{quiz.description || 'Fara descriere'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void fetchQuestions(quiz.id)}
                    className="rounded-lg border border-cyan-400/20 px-3 py-1 text-sm text-cyan-200"
                  >
                    Manage întrebări
                  </button>
                  <span className="text-xs text-cyan-300">Prag {quiz.passing_score_percentage}%</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Questions panel */}
      {managingQuizId && (
        <div className="mt-4 w-full rounded-lg border border-cyan-400/20 bg-[#080b14] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Întrebări test</h3>
            <button onClick={() => setManagingQuizId(null)} className="text-sm text-slate-400">Închide</button>
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-slate-400">Nicio întrebare definită încă.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="rounded border border-white/6 p-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">{q.question_text}</strong>
                    <span className="text-xs text-slate-400">{q.question_type}</span>
                  </div>
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-sm text-slate-300">
                      {q.options.map((opt: any, idx: number) => (
                        <li key={idx}>{String(opt)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCreateQuestion} className="mt-4 space-y-3 rounded border-t pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={questionForm.question_type}
                onChange={(e) => setQuestionForm((p) => ({ ...p, question_type: e.target.value }))}
                className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="CODE">Code</option>
                <option value="ESSAY">Essay</option>
              </select>
              <input
                value={questionForm.points}
                onChange={(e) => setQuestionForm((p) => ({ ...p, points: Number(e.target.value) }))}
                type="number"
                min={0}
                className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
                placeholder="Puncte"
              />
            </div>

            <input
              value={questionForm.question_text}
              onChange={(e) => setQuestionForm((p) => ({ ...p, question_text: e.target.value }))}
              className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              placeholder="Text întrebare"
              required
            />

            {questionForm.question_type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {questionForm.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => setQuestionForm((p) => ({ ...p, options: p.options.map((o,i) => i===idx? e.target.value : o) }))}
                      className="flex-1 rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
                      placeholder={`Opțiune ${idx+1}`}
                    />
                    <button type="button" onClick={() => setQuestionForm((p) => ({ ...p, options: p.options.filter((_,i)=>i!==idx) }))} className="rounded px-2">✖</button>
                  </div>
                ))}
                <button type="button" onClick={() => setQuestionForm((p) => ({ ...p, options: [...p.options, ''] }))} className="rounded-lg bg-cyan-500 px-3 py-2 text-white">Adaugă opțiune</button>
                <input
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, correct_answer: e.target.value }))}
                  className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
                  placeholder="Răspuns corect (text exact sau index)"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">Adaugă întrebare</button>
              <button type="button" onClick={() => setManagingQuizId(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-300">Close</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
