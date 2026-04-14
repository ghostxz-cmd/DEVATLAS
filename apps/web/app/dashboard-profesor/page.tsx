"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type DashboardOverview = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    status: string;
    completionPercent: number;
    title: string | null;
    expertise: string[];
    hasProfileRecord: boolean;
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
    profileCompletion: number;
  };
  courses: Array<{
    courseId: string;
    title: string;
    slug: string;
    level: string;
    category: string | null;
    thumbnailUrl: string | null;
    estimatedMins: number | null;
    createdAt: string;
    visibility: string;
    lessonCount: number;
    enrollmentCount: number;
    studentCount: number;
    averageRating: number | null;
    reviewCount: number;
    status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
  }>;
  activityFeed: Array<{
    kind: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
  feedbackSummary: Array<{
    courseId: string;
    courseTitle: string;
    rating: number;
    reviewCount: number;
  }>;
  recommendations: Array<{
    kind: string;
    title: string;
    description: string;
    reason: string;
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
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Nu există o sesiune activă de profesor.");
        }

        const response = await fetch("/api/dashboard/instructor/overview", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
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

  const activity = (data?.activityFeed ?? []).map((item) => ({
    title: item.title,
    detail: item.detail,
    time: formatTime(item.createdAt),
    kind: item.kind,
  }));

  const profile = data?.profile;
  const summary = data?.summary;

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
      value: summary?.coursesActive ?? 0,
      note: "Publicate",
    },
    {
      label: "Studenți",
      value: summary?.totalStudents ?? 0,
      note: "Înscriși real",
    },
    {
      label: "Lecții",
      value: summary?.totalLessons ?? 0,
      note: "Structură completă",
    },
    {
      label: "Feedback mediu",
      value: summary?.averageFeedback ?? 0,
      note: "Rating real",
    },
    {
      label: "Profil",
      value: summary?.profileCompletion ?? 0,
      note: "% finalizat",
    },
  ];

  return (
    <section className="space-y-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">General</h1>
          <p className="mt-1 text-sm text-gray-300">Date reale din contul profesorului, cursuri, feedback si activitate.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile?.title ? (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                {profile.title}
              </span>
            ) : null}
            {(profile?.expertise ?? []).slice(0, 4).map((skill) => (
              <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{card.value}</div>
            <p className="mt-1 text-xs text-gray-300">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Profil si recomandari</h3>
            <span className="text-xs text-gray-300">real data</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-300">Cont</p>
              <p className="mt-2 text-lg font-semibold text-white">{profile?.fullName ?? "Profesor"}</p>
              <p className="text-sm text-gray-300">{profile?.email ?? "-"}</p>
              <p className="mt-3 text-xs text-gray-300">Status: {profile?.status ?? "-"}</p>
              <p className="text-xs text-gray-300">Profil complet: {profile?.completionPercent ?? 0}%</p>
              <p className="mt-3 text-xs text-gray-300">
                {profile?.hasProfileRecord ? "Profilul instructorului exista in baza de date." : "Lipseste recordul instructorului."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white">Recomandari</h4>
                  <span className="text-xs text-gray-300">{data?.recommendations.length ?? 0}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {(data?.recommendations ?? []).slice(0, 3).map((item) => (
                    <div key={`${item.kind}-${item.title}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-300">{item.description}</p>
                    </div>
                  ))}
                  {!loading && (data?.recommendations ?? []).length === 0 ? (
                    <p className="text-sm text-gray-300">Nu exista recomandari urgente.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-gray-300">Expertiza</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(profile?.expertise ?? []).length > 0 ? (
                    profile!.expertise.map((skill) => (
                      <span key={skill} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-300">Nu exista expertiza setata.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Activitate recenta</h3>
            <span className="text-xs text-gray-300">{summary?.recentActivityCount ?? 0} intrari</span>
          </div>

          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={`${item.title}-${item.time}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <span className="text-[11px] text-gray-400">{item.time}</span>
                </div>
                <p className="mt-1 text-xs text-gray-300">{item.detail}</p>
              </div>
            ))}
            {!loading && activity.length === 0 ? <p className="text-sm text-gray-300">Nu exista activitate recenta pentru acest cont.</p> : null}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Cursuri proprii</h3>
            <span className="text-xs text-gray-300">{summary?.totalCourses ?? 0} total</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data?.courses ?? []).slice(0, 6).map((course) => (
              <div key={course.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{course.title}</p>
                    <p className="text-xs text-gray-300">
                      {course.category || "General"} • {course.level}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                    {course.status}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (course.averageRating ?? 0) * 20)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-300">
                  <span>{course.lessonCount} lectii</span>
                  <span>{course.studentCount} studenti</span>
                  <span>{course.averageRating ?? 0}/5</span>
                </div>
              </div>
            ))}
            {!loading && (data?.courses ?? []).length === 0 ? <p className="text-sm text-gray-300">Acest instructor nu are inca niciun curs creat.</p> : null}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Feedback top</h3>
            <span className="text-xs text-gray-300">by course</span>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.feedbackSummary ?? []).map((item) => (
              <div key={item.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.courseTitle}</p>
                  <span className="text-xs text-cyan-200">{item.rating}/5</span>
                </div>
                <p className="mt-1 text-xs text-gray-300">{item.reviewCount} review-uri reale</p>
              </div>
            ))}
            {!loading && (data?.feedbackSummary ?? []).length === 0 ? (
              <p className="text-sm text-gray-300">Nu exista feedback inca pentru cursurile acestui profesor.</p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}