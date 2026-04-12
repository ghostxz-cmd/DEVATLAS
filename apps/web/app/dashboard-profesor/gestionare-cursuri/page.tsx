"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  summary: {
    coursesActive: number;
    coursesDraft: number;
    coursesInReview: number;
    totalLessons: number;
  };
  courses: Array<{
    courseId: string;
    title: string;
    status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
    lessonCount: number;
    enrollmentCount: number;
    studentCount: number;
    visibility: string;
  }>;
};

export default function InstructorCourseManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/instructor/overview", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Nu am putut încărca cursurile.");
        }

        const payload = (await response.json()) as DashboardData;
        setData(payload);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nu am putut încărca cursurile."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const cards = [
    {
      label: "Cursuri publicate",
      value: data?.summary.coursesActive ?? 0,
      hint: "Active pe platformă",
    },
    {
      label: "Drafturi",
      value: data?.summary.coursesDraft ?? 0,
      hint: "În lucru",
    },
    {
      label: "În review",
      value: data?.summary.coursesInReview ?? 0,
      hint: "Așteaptă validare",
    },
    {
      label: "Lecții totale",
      value: data?.summary.totalLessons ?? 0,
      hint: "În toate cursurile",
    },
  ];

  const pipeline = (data?.courses ?? []).slice(0, 3).map((course) => ({
    title: course.title,
    status:
      course.status === "PUBLISHED"
        ? "Publicat"
        : course.status === "DRAFT"
          ? "Draft"
          : "Review",
    eta:
      course.studentCount > 0
        ? `${course.studentCount} studenți`
        : "În așteptare",
  }));

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Gestionare cursuri</h1>
        <p className="mt-2 text-sm text-gray-300">
          Nu am putut încărca datele cursurilor.
        </p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Gestionare cursuri</h1>
          <p className="mt-1 text-sm text-gray-300">Workspace pentru publicare, review și update-uri pe conținut.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          instructor mode
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{loading ? "-" : card.value}</div>
            <p className="mt-1 text-xs text-gray-300">{card.hint}</p>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pipeline conținut</h3>
          <span className="text-xs text-gray-300">ultimele actualizări</span>
        </div>

        {loading ? (
          <div className="mt-4 text-center text-sm text-gray-300">Încărcare...</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {pipeline.length > 0 ? (
              pipeline.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
                    <span>{item.status}</span>
                    <span>{item.eta}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-cyan-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-sm text-gray-300">
                Nu au fost găsite cursuri
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
