'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface TaskManagerProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

export default function TaskManager({ moduleId, courseId, accessToken }: TaskManagerProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    pointsPossible: 100,
  });
  const [openSubmit, setOpenSubmit] = useState(false);
  const [submittingTask, setSubmittingTask] = useState<any | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openSubmissions, setOpenSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/tasks?moduleId=${encodeURIComponent(moduleId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Nu am putut incarca taskurile.');
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Eroare la incarcare.');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [courseId, moduleId, accessToken]);

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const res = await fetch(`/api/courses/${courseId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ ...formData, moduleId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Nu am putut crea taskul.');
      }

      const created = await res.json();
      setTasks((previous) => [created, ...previous]);
      setOpenForm(false);
      setFormData({
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        pointsPossible: 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la creare.');
    }
  };

  const openSubmitModal = (task: any) => {
    setSubmittingTask(task);
    setFileToUpload(null);
    setUploadError(null);
    setOpenSubmit(true);
  };

  const openSubmissionsModal = async (task: any) => {
    setSubmittingTask(task);
    setOpenSubmissions(true);
    setLoadingSubmissions(true);
    try {
      // get access token
      let headers: Record<string, string> = {};
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {}

      const res = await fetch(`/api/courses/${courseId}/tasks/${task.id}/submissions`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Nu am putut incarca submisii');
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchSubmissions = async (taskId: string) => {
    setLoadingSubmissions(true);
    try {
      let headers: Record<string, string> = {};
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {}

      const res = await fetch(`/api/courses/${courseId}/tasks/${taskId}/submissions`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Nu am putut incarca submisii');
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGrade = async (submissionId: string, score: number | null, feedback: string | null) => {
    setGrading(true);
    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {}

      const res = await fetch(`/api/courses/${courseId}/tasks/${submittingTask.id}/submissions`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ submissionId, score, feedback }),
      });
      if (!res.ok) throw new Error('Eroare la notare');
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      // Refresh signed URLs and latest data from server
      if (submittingTask?.id) await fetchSubmissions(submittingTask.id);
    } catch (err) {
      // swallow for now
    } finally {
      setGrading(false);
    }
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!submittingTask) return setUploadError('No task selected');
    if (!fileToUpload) return setUploadError('Please select a file');

    // Enforce 10GB limit (10 * 1024^3)
    const maxBytes = 10 * 1024 * 1024 * 1024;
    if (fileToUpload.size > maxBytes) return setUploadError('Fișierul depășește limita de 10GB');

    try {
      setUploading(true);
      const supabase = getSupabaseBrowserClient();

      // Build a storage path: submissions/{courseId}/{moduleId}/{taskId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `submissions/${courseId}/${moduleId}/${submittingTask.id}/${timestamp}_${safeName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('course-assets')
        .upload(path, fileToUpload, { upsert: false });

      if (uploadErr) throw uploadErr;

      // Record submission metadata on the server
      const res = await fetch(`/api/courses/${courseId}/tasks/${submittingTask.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadData?.path ?? path,
          file_name: fileToUpload.name,
          file_size: fileToUpload.size,
          mime_type: fileToUpload.type,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Eroare la trimitere');
      }

      setOpenSubmit(false);
      setFileToUpload(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Eroare la upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Gestionare Taskuri</h2>
        <button
          onClick={() => setOpenForm((value) => !value)}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-white transition hover:bg-cyan-600"
        >
          + Creare Task
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {openForm && (
        <form onSubmit={handleCreateTask} className="space-y-3 rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Titlu task"
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            />
            <input
              type="number"
              value={formData.pointsPossible}
              onChange={(e) => setFormData({ ...formData, pointsPossible: Number(e.target.value) })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              min={1}
            />
          </div>
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">Salveaza task</button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-slate-400">Se incarca taskurile...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-400">Nu exista taskuri in acest modul.</p>
        ) : (
          tasks.map((task) => (
            <article key={task.id} className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{task.title}</h3>
                <span className="text-xs text-cyan-300">{task.points_possible} pct</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{task.description || 'Fara descriere'}</p>
              {task.due_date && (
                <p className="mt-2 text-xs text-slate-500">Termen: {new Date(task.due_date).toLocaleString('ro-RO')}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openSubmitModal(task)}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white"
                >
                  Trimite tema
                </button>
                <button
                  onClick={() => openSubmissionsModal(task)}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white"
                >
                  Vezi submisii
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      {openSubmissions && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-[#071025] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Submisii: {submittingTask?.title}</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => fetchSubmissions(submittingTask?.id)} className="text-slate-200">Reîncarcă</button>
                <button onClick={() => setOpenSubmissions(false)} className="text-slate-400">Inchide</button>
              </div>
            </div>

            <div className="mt-4">
              {loadingSubmissions ? (
                <p className="text-slate-400">Se incarca...</p>
              ) : submissions.length === 0 ? (
                <p className="text-slate-400">Nicio submisie pentru acest task.</p>
              ) : (
                <div className="space-y-3">
                  {submissions.map((s) => (
                    <div key={s.id} className="rounded-md border border-slate-700 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">{s.users?.full_name ?? 'Student'}</div>
                          <div className="text-xs text-slate-400">Trimis: {new Date(s.submitted_at).toLocaleString('ro-RO')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {Array.isArray(s.attachments) && s.attachments.length > 0 && (
                            <div className="flex gap-2">
                              {s.attachments.map((att: any, idx: number) => (
                                <a key={idx} href={att.signedUrl ?? '#'} target="_blank" rel="noreferrer" className="text-cyan-400">{att.file_name ?? `Fișier ${idx + 1}`}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-300">{s.submission_text ?? ''}</div>
                      <div className="mt-3 flex items-center gap-3">
                        <input placeholder="Nota" type="number" defaultValue={s.score ?? ''} className="w-24 rounded bg-black px-2 py-1 text-white" id={`score-${s.id}`} />
                        <input placeholder="Feedback" defaultValue={s.feedback ?? ''} className="flex-1 rounded bg-black px-2 py-1 text-white" id={`feedback-${s.id}`} />
                        <button
                          onClick={() => {
                            const scoreEl = document.getElementById(`score-${s.id}`) as HTMLInputElement | null;
                            const fbEl = document.getElementById(`feedback-${s.id}`) as HTMLInputElement | null;
                            const score = scoreEl?.value ? Number(scoreEl.value) : null;
                            const feedback = fbEl?.value ?? null;
                            handleGrade(s.id, score, feedback);
                          }}
                          disabled={grading}
                          className="rounded-md bg-amber-500 px-3 py-1 text-sm text-black"
                        >
                          Salveaza nota
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {openSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleSubmitFile} className="w-full max-w-2xl rounded-lg bg-[#071025] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Trimite tema: {submittingTask?.title}</h3>
              <button type="button" onClick={() => setOpenSubmit(false)} className="text-slate-400">Inchide</button>
            </div>
            <p className="mt-2 text-sm text-slate-400">Poti incarca fișiere până la 10GB. Se recomandă arhivare pentru fisiere multiple.</p>

            <div className="mt-4">
              <input
                type="file"
                onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-200"
              />
            </div>

            {uploadError && <div className="mt-3 text-sm text-red-400">{uploadError}</div>}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-white disabled:opacity-60"
              >
                {uploading ? 'Se incarca...' : 'Trimite'}
              </button>
              <button type="button" onClick={() => setOpenSubmit(false)} className="text-slate-400">Anuleaza</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
