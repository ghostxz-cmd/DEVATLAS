'use client';

import { useEffect, useMemo, useState } from 'react';

interface CalendarViewProps {
  moduleId: string;
  courseId: string;
  accessToken?: string;
}

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_link: string | null;
};

export default function CalendarView({ moduleId, courseId, accessToken }: CalendarViewProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'LECTURE',
    startTime: '',
    endTime: '',
    location: '',
    meetingLink: '',
    isOnline: false,
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/calendar-events?moduleId=${encodeURIComponent(moduleId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Nu am putut incarca evenimentele.');
        }

        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Eroare la incarcare.');
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, [courseId, moduleId, accessToken]);

  const upcomingCount = useMemo(
    () => events.filter((event) => new Date(event.start_time).getTime() >= Date.now()).length,
    [events],
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.start_time.slice(0, 10); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  function formatForInput(dt?: string | Date) {
    const d = dt ? new Date(dt) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function addMonths(d: Date, n: number) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  const handleCreateEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/courses/${courseId}/calendar-events`, {
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

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Nu am putut crea evenimentul.');
      }

      const created = await response.json();
      setEvents((previous) => [created, ...previous]);
      setOpenForm(false);
      setFormData({
        title: '',
        description: '',
        eventType: 'LECTURE',
        startTime: '',
        endTime: '',
        location: '',
        meetingLink: '',
        isOnline: false,
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Eroare la creare.');
    }
  };

  const weeks = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const startDay = first.getDay(); // 0-6 (Sun-Sat)
    const days: Array<Date> = [];
    const offset = (startDay + 6) % 7; // shift so Monday is first
    for (let i = -offset; i < 42 - offset; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + i);
      days.push(d);
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [currentMonth]);

  const handleDayClick = (d: Date) => {
    const start = new Date(d);
    start.setHours(10, 0, 0, 0);
    const end = new Date(d);
    end.setHours(11, 0, 0, 0);
    setFormData((f) => ({
      ...f,
      startTime: formatForInput(start),
      endTime: formatForInput(end),
    }));
    setOpenForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Calendar și Evenimente</h2>
          <p className="text-sm text-slate-400">{upcomingCount} evenimente viitoare în modulul curent</p>
        </div>
        <button
          onClick={() => setOpenForm((value) => !value)}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-white transition hover:bg-cyan-600"
        >
          + Adaugă Eveniment
        </button>
      </div>

      {/* Calendar month navigator and grid */}
      <div className="rounded-2xl border border-white/10 bg-[#071022] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
              className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-white/5"
            >
              ◀
            </button>
            <div className="text-sm font-semibold text-white">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-white/5"
            >
              ▶
            </button>
          </div>
          <div className="text-sm text-slate-400">Click pe o zi pentru a crea eveniment</div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-slate-400">
          {['Lun','Mar','Mie','Joi','Vin','Sâm','Dum'].map((d) => (
            <div key={d} className="text-center font-semibold">{d}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid gap-2">
              {week.map((day) => {
                const key = day.toISOString().slice(0,10);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const dayEvents = eventsByDate[key] || [];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`group relative flex h-16 w-full flex-col items-start justify-start gap-1 rounded p-2 text-left transition ${isCurrentMonth ? 'bg-white/3 hover:bg-white/6' : 'opacity-40'} `}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-white' : 'text-slate-400'}`}>{day.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[11px] font-semibold text-black">{dayEvents.length}</span>
                      )}
                    </div>
                    <div className="mt-1 flex w-full flex-col gap-1">
                      {dayEvents.slice(0,2).map((ev) => (
                        <div key={ev.id} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">{ev.title}</div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {openForm && (
        <form onSubmit={handleCreateEvent} className="space-y-3 rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Titlu eveniment"
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              required
            />
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            >
              <option value="LECTURE">Lecture</option>
              <option value="LAB">Lab</option>
              <option value="EXAM">Exam</option>
              <option value="MEETING">Meeting</option>
              <option value="DEADLINE">Deadline</option>
            </select>
            <input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Locație"
              className="rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
            />
          </div>
          <input
            value={formData.meetingLink}
            onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
            placeholder="Link meeting"
            className="w-full rounded-lg border border-cyan-400/20 bg-black px-3 py-2 text-white outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={formData.isOnline}
              onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
            />
            Eveniment online
          </label>
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-white">Salvează eveniment</button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-slate-400">Se încarcă evenimentele...</p>
        ) : events.length === 0 ? (
          <p className="text-slate-400">Nu există evenimente în acest modul.</p>
        ) : (
          events.map((event) => (
            <article key={event.id} className="rounded-lg border border-cyan-400/20 bg-[#070b14] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{event.title}</h3>
                <span className="text-xs text-cyan-300">{event.event_type}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{event.description || 'Fără descriere'}</p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(event.start_time).toLocaleString('ro-RO')} - {new Date(event.end_time).toLocaleString('ro-RO')}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
