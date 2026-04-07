"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardOverview = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    status: string;
    completionPercent: number;
    hasUserRecord: boolean;
  };
  summary: {
    enrolledCourses: number;
    activeCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    totalXp: number;
    profileCompletion: number;
    courseCompletion: number;
    recentActivityCount: number;
    openSupportTickets: number;
  };
  courses: Array<{
    courseId: string;
    title: string;
    slug: string;
    level: string;
    category: string | null;
    thumbnailUrl: string | null;
    estimatedMins: number | null;
    enrolledAt: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    lastActivityAt: string;
    nextLessonTitle: string | null;
    status: string;
  }>;
  xpChart: Array<{
    label: string;
    date: string;
    points: number;
  }>;
  activityFeed: Array<{
    kind: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
  recommendations: Array<{
    kind: string;
    title: string;
    description: string;
    reason: string;
  }>;
  achievements: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    xpReward: number;
  }>;
  community: {
    friendsAvailable: boolean;
    friendsCount: number | null;
    note: string;
    notificationsCount: number;
    supportTicketsCount: number;
  };
  schemaWarnings: string[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBadgeColor(kind: string) {
  switch (kind) {
    case "course":
      return "bg-[#2563eb]";
    case "xp":
      return "bg-[#84cc16]";
    case "support":
      return "bg-[#f59e0b]";
    case "activity":
      return "bg-[#0ea5e9]";
    default:
      return "bg-[#111827]";
  }
}

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/student/overview", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca datele dashboard-ului.");
        }

        const payload = (await response.json()) as DashboardOverview;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca datele dashboard-ului.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const xpMax = useMemo(() => Math.max(1, ...(data?.xpChart.map((item) => item.points) ?? [1])), [data]);
  const profile = data?.profile;
  const summary = data?.summary;

  if (error) {
    return (
      <section className="rounded-3xl border border-[#e5e7eb] bg-white p-6 text-[#0f172a] shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Dashboard Elev</h1>
        <p className="mt-2 text-sm text-[#64748b]">Nu am putut încărca datele reale ale contului.</p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Dashboard Elev</h1>
          <p className="mt-1 text-sm text-[#64748b]">Date reale din contul tău, cursuri, progres și activitate.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>

        <div className="flex w-full flex-wrap gap-2 pt-1">
          {[
            "General",
            "Cursuri",
            "XP",
            "Prieteni",
            "Activitate",
            "Cont",
          ].map((chip, index) => (
            <span
              key={chip}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${index === 0 ? "border-[#111827] bg-[#111827] text-white" : "border-[#d5daea] bg-[#f8faff] text-[#64748b]"}`}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Profil</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] text-sm font-black text-white">
              {(profile?.fullName?.trim().charAt(0) || "E").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#0f172a]">{profile?.fullName ?? "Elev"}</p>
              <p className="truncate text-sm text-[#64748b]">{profile?.email ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2 text-[#334155]">
              Status: {profile?.status ?? "-"}
            </div>
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2 text-[#334155]">
              Timezone: {profile?.timezone || "nesetat"}
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Cursuri enrolled</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{summary?.enrolledCourses ?? 0}</div>
          <p className="mt-1 text-xs text-[#64748b]">Cursuri reale asociate contului tău.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Active: {summary?.activeCourses ?? 0}</div>
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Finalizate: {summary?.completedCourses ?? 0}</div>
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Lecții: {summary?.completedLessons ?? 0}/{summary?.totalLessons ?? 0}</div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">XP total</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{summary?.totalXp ?? 0}</div>
          <p className="mt-1 text-xs text-[#64748b]">Calculat din `xp_ledger`.</p>
          <div className="mt-4 h-2 rounded-full bg-[#e2e8f0]">
            <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${Math.min(100, summary?.profileCompletion ?? 0)}%` }} />
          </div>
          <div className="mt-2 text-xs text-[#64748b]">Profil completat: {summary?.profileCompletion ?? 0}%</div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Comunitate</p>
          <div className="mt-2 text-[30px] font-bold leading-none">
            {data?.community.friendsAvailable ? (data.community.friendsCount ?? 0) : "--"}
          </div>
          <p className="mt-1 text-xs text-[#64748b]">{data?.community.note ?? "Zona socială este pregătită."}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Notificări: {data?.community.notificationsCount ?? 0}</div>
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2">Support: {data?.community.supportTicketsCount ?? 0}</div>
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">Progres pe cursuri</h3>
              <p className="mt-1 text-xs text-[#64748b]">Date reale din `enrollments`, `progress`, `lessons` și `courses`.</p>
            </div>
            <span className="rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs text-[#64748b]">overview</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data?.courses ?? []).slice(0, 6).map((course) => (
              <div key={course.courseId} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{course.title}</p>
                    <p className="text-xs text-[#64748b]">{course.category || "General"} • {course.level}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#334155]">{course.progressPercent}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#e2e8f0]">
                  <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${course.progressPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748b]">
                  <span>{course.completedLessons}/{course.totalLessons} lecții</span>
                  <span>{course.nextLessonTitle || formatDate(course.lastActivityAt)}</span>
                </div>
              </div>
            ))}

            {!data?.courses?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b] md:col-span-2">
                Nu ai încă niciun curs enrolled sau schema nu are date pentru acest cont.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Recomandări reale</h3>
            <span className="text-xs text-[#64748b]">bazate pe cont</span>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.recommendations ?? []).map((item) => (
              <div key={`${item.kind}-${item.title}`} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${getBadgeColor(item.kind)}`} />
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{item.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#94a3b8]">{item.reason}</p>
              </div>
            ))}

            {!data?.recommendations?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu există recomandări de generat pe datele curente.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[#d6deef] bg-gradient-to-r from-[#eff6ff] to-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Schema warnings</p>
            <ul className="mt-2 space-y-1 text-sm text-[#334155]">
              {(data?.schemaWarnings ?? []).map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
              {!data?.schemaWarnings?.length && <li>• Nicio atenționare.</li>}
            </ul>
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">XP în ultimele 7 zile</h3>
            <span className="text-xs text-[#64748b]">din ledger</span>
          </div>

          <div className="mt-4 flex h-56 items-end gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            {(data?.xpChart ?? []).map((item) => {
              const height = Math.max(10, Math.round((item.points / xpMax) * 100));
              return (
                <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end rounded-xl bg-white p-1 shadow-sm">
                    <div className="w-full rounded-lg bg-[#2563eb]" style={{ height: `${height}%` }} />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#94a3b8]">{item.label}</div>
                  <div className="text-xs font-semibold text-[#0f172a]">{item.points}</div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">Activitate recentă</h3>
            <span className="text-xs text-[#64748b]">recent</span>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.activityFeed ?? []).map((item) => (
              <div key={`${item.kind}-${item.createdAt}-${item.title}`} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  <span className="text-[11px] text-[#94a3b8]">{formatTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{item.detail}</p>
              </div>
            ))}

            {!data?.activityFeed?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu există activitate recentă de afișat.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">Achievements</h3>
            <span className="text-xs text-[#64748b]">reale</span>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.achievements ?? []).map((achievement) => (
              <div key={achievement.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <p className="text-sm font-semibold text-[#0f172a]">{achievement.name}</p>
                <p className="mt-1 text-xs text-[#64748b]">{achievement.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#94a3b8]">+{achievement.xpReward} XP</p>
              </div>
            ))}

            {!data?.achievements?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu există badges de afișat pentru acest cont.
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
