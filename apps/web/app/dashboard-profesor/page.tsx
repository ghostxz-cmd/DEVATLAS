"use client";

import { useEffect, useState } from "react";

type DashboardOverview = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    status: string;
    completionPercent: number;
  };
  summary: {
    coursesActive: number;
    coursesDraft: number;
    coursesInReview: number;
    totalCourses: number;
    totalStudents: number;
    totalLessons: number;
    averageFeedback: number;
    recentActivityCount: number;
  };
  activityFeed: Array<{
    kind: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
};

function formatTime(dateValue: string) {
  const now = new Date();
  const date = new Date(dateValue);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `acum ${diffMins}m`;
  if (diffHours < 24) return `acum ${diffHours}h`;
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `acum ${diffDays}z`;
  return date.toLocaleDateString("ro-RO");
}

export default function InstructorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/instructor/overview", {
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            payload?.message ||
              "Nu am putut încărca datele dashboard-ului profesor."
          );
        }

        const payload = (await response.json()) as DashboardOverview;
        setData(payload);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nu am putut încărca datele dashboard-ului profesor."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Dashboard Profesor</h1>
        <p className="mt-2 text-sm text-gray-300">
          Nu am putut încărca datele reale ale contului.
        </p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
          {error}
        </div>
      </section>
    );
  }

  const cards = [
    {
      label: "Cursuri active",
      value: data?.summary.coursesActive ?? 0,
      note: "Publicate",
    },
    {
      label: "Studenți",
      value: data?.summary.totalStudents ?? 0,
      note: "Înscriși",
    },
    {
      label: "Feedback mediu",
      value: data?.summary.averageFeedback ?? 0,
      note: "Evaluare",
    },
    {
      label: "Lecții",
      value: data?.summary.totalLessons ?? 0,
      note: "Total",
    },
  ];

  const activity = (data?.activityFeed ?? []).map((item) => ({
    title: item.title,
    detail: item.detail,
    time: formatTime(item.createdAt),
  }));

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">General</h1>
          <p className="mt-1 text-sm text-gray-300">Panou profesor cu overview rapid pe cursuri, activitate și progres.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          instructor dashboard
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{card.value}</div>
            <p className="mt-1 text-xs text-gray-300">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Activitate recentă</h3>
            <span className="text-xs text-gray-300">live</span>
          </div>

          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <span className="text-[11px] text-gray-400">{item.time}</span>
                </div>
                <p className="mt-1 text-xs text-gray-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Stare cursuri</h3>
            <span className="text-xs text-gray-300">quality gate</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-300">Conținut actualizat</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-cyan-400" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-300">Lecții în review</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-cyan-400" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-300">Satisfacție curs</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-full w-[92%] rounded-full bg-cyan-400" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}