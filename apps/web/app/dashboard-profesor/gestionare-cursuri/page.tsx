"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type DashboardData = {
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
    status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
    lessonCount: number;
    enrollmentCount: number;
    studentCount: number;
    averageRating: number | null;
    reviewCount: number;
    visibility: string;
  }>;
};

type GroupOption = {
  id: string;
  title: string;
  kind: "FOLDER" | "MODULE";
};

type CreateSection = "general" | "structure" | "publish" | "catalog";

type CreateCourseForm = {
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  language: string;
  estimatedHours: string;
  requiredLevel: string;
  groupId: string;
  visibility: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  objectives: string;
  targetAudience: string;
  prerequisites: string;
  welcomeMessage: string;
};

const CREATE_COURSE_INITIAL_FORM: CreateCourseForm = {
  title: "",
  slug: "",
  description: "",
  thumbnailUrl: "",
  level: "BEGINNER",
  language: "ro",
  estimatedHours: "",
  requiredLevel: "",
  groupId: "",
  visibility: "DRAFT",
  objectives: "",
  targetAudience: "",
  prerequisites: "",
  welcomeMessage: "",
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatHoursFromMinutes(totalMinutes: number | null) {
  if (!totalMinutes || totalMinutes <= 0) {
    return "0 ore";
  }

  const hours = totalMinutes / 60;
  const rounded = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  return `${rounded} ore`;
}

export default function InstructorCourseManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState<CreateSection>("general");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateCourseForm>(CREATE_COURSE_INITIAL_FORM);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Nu există o sesiune activă de profesor.");
        }

        const [overviewResponse, groupsResponse] = await Promise.all([
          fetch("/api/dashboard/instructor/overview", {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
          fetch("/api/dashboard/instructor/course-groups", {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        ]);

        if (!overviewResponse.ok) {
          const payload = (await overviewResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca cursurile.");
        }

        if (groupsResponse.ok) {
          const groupsPayload = (await groupsResponse.json().catch(() => null)) as
            | { groups?: Array<{ id: string; title: string; kind: "FOLDER" | "MODULE" }> }
            | null;
          setGroupOptions((groupsPayload?.groups ?? []).map((group) => ({
            id: group.id,
            title: group.title,
            kind: group.kind,
          })));
        }

        const payload = (await overviewResponse.json()) as DashboardData;
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

  useEffect(() => {
    if (!createForm.slug.trim() && createForm.title.trim()) {
      setCreateForm((previous) => ({
        ...previous,
        slug: toSlug(previous.title),
      }));
    }
  }, [createForm.title, createForm.slug]);

  const handleCreateChange = <K extends keyof CreateCourseForm>(field: K, value: CreateCourseForm[K]) => {
    setCreateForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleThumbnailFileChange = async (file: File | null) => {
    if (!file) {
      handleCreateChange("thumbnailUrl", "");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setCreateError("Imagine invalidă. Folosește JPG, PNG, WEBP sau GIF.");
      return;
    }

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setCreateError("Imaginea este prea mare. Maxim 4MB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Nu am putut încărca fișierul."));
      reader.readAsDataURL(file);
    });

    setCreateError(null);
    handleCreateChange("thumbnailUrl", dataUrl);
  };

  const resetCreateState = () => {
    setCreateSection("general");
    setCreateError(null);
    setCreateSubmitting(false);
    setCreateForm(CREATE_COURSE_INITIAL_FORM);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    resetCreateState();
  };

  const openCreateModal = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateCourse = async () => {
    if (!createForm.title.trim()) {
      setCreateError("Titlul cursului este obligatoriu.");
      setCreateSection("general");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Nu există sesiune activă de profesor.");
      }

      const metadata = {
        objectives: createForm.objectives
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        targetAudience: createForm.targetAudience
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        prerequisites: createForm.prerequisites
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        welcomeMessage: createForm.welcomeMessage.trim() || null,
      };

      const response = await fetch("/api/dashboard/instructor/course-groups", {
          cache: "no-store",
        method: "POST",
          headers: {
          "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        body: JSON.stringify({
          mode: "course",
          groupId: createForm.groupId || null,
          title: createForm.title.trim(),
          slug: createForm.slug.trim() || toSlug(createForm.title),
          description: createForm.description.trim() || null,
          level: createForm.level,
          language: createForm.language.trim() || "ro",
          visibility: createForm.visibility,
          estimatedMins: createForm.estimatedHours.trim()
            ? Math.max(1, Math.round(Number(createForm.estimatedHours.trim()) * 60))
            : null,
          requiredLevel: createForm.requiredLevel.trim() || null,
          thumbnailUrl: createForm.thumbnailUrl.trim() || null,
          metadata,
          publishedAt: createForm.visibility === "PUBLISHED" ? new Date().toISOString() : null,
        }),
        });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut crea cursul.");
      }

      const payload = (await response.json()) as {
        course?: {
          id: string;
          slug: string;
          title: string;
          level: string;
          visibility: string;
          estimated_mins: number | null;
          created_at: string;
        };
      };

      const createdCourse = payload.course;
      if (createdCourse) {
        setData((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            summary: {
              ...previous.summary,
              totalCourses: previous.summary.totalCourses + 1,
              coursesActive: previous.summary.coursesActive + (createdCourse.visibility === "PUBLISHED" ? 1 : 0),
              coursesDraft: previous.summary.coursesDraft + (createdCourse.visibility === "DRAFT" ? 1 : 0),
              coursesInReview: previous.summary.coursesInReview,
            },
            courses: [
              {
                courseId: createdCourse.id,
                title: createdCourse.title,
                slug: createdCourse.slug,
                level: createdCourse.level.toLowerCase(),
                category: null,
                thumbnailUrl: null,
                estimatedMins: createdCourse.estimated_mins ?? null,
                createdAt: createdCourse.created_at,
                status: createdCourse.visibility === "DRAFT" ? "DRAFT" : createdCourse.visibility === "IN_REVIEW" ? "IN_REVIEW" : "PUBLISHED",
                lessonCount: 0,
                enrollmentCount: 0,
                studentCount: 0,
                averageRating: null,
                reviewCount: 0,
                visibility: createdCourse.visibility,
              },
              ...previous.courses,
            ],
          };
        });
      }

      closeCreateModal();
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : "Nu am putut crea cursul.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const createSections: Array<{ id: CreateSection; label: string }> = [
    { id: "general", label: "Setări generale" },
    { id: "structure", label: "Structură" },
    { id: "publish", label: "Publicare" },
    { id: "catalog", label: "Detalii catalog" },
  ];

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.courses ?? []).filter((course) => {
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesQuery = !needle || [course.title, course.slug, course.category, course.level].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [data, query, statusFilter]);

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
    {
      label: "Feedback mediu",
      value: data?.summary.averageFeedback ?? 0,
      hint: "Scor real din review-uri",
    },
  ];

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
          <p className="mt-1 text-sm text-gray-300">Gestionarea cursurilor proprii pe baza datelor reale din platformă.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
          >
            Creează curs nou
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            {loading ? "syncing" : "active"}
          </div>
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
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după titlu, slug, nivel sau categorie..."
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">Toate statusurile</option>
            <option value="PUBLISHED">Publicate</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">În review</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pipeline conținut</h3>
          <span className="text-xs text-gray-300">{filteredCourses.length} rezultate</span>
        </div>

        {loading ? (
          <div className="mt-4 text-center text-sm text-gray-300">Încărcare...</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <div key={course.courseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{course.title}</p>
                      <p className="text-xs text-gray-300">{course.category || "General"} • {course.level}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                      {course.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Lecții: {course.lessonCount}</div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Studenți: {course.studentCount}</div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Review-uri: {course.reviewCount}</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (course.averageRating ?? 0) * 20)}%` }} />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-300">
                    <span>{course.averageRating ?? 0}/5 feedback</span>
                    <span>{formatHoursFromMinutes(course.estimatedMins)}</span>
                  </div>

                  <p className="mt-3 text-[11px] text-gray-400">Creat la {formatDate(course.createdAt)}</p>

                  <Link
                    href={`/dashboard-profesor-management/${course.courseId}`}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
                  >
                    Gestionare curs
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-sm text-gray-300">
                Nu au fost găsite cursuri pentru filtrele curente.
              </div>
            )}
          </div>
        )}
      </article>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#030712] text-white shadow-[0_24px_60px_rgba(2,6,23,0.5)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Creare curs nou</h2>
                <p className="mt-1 text-xs text-gray-300">Completează datele pe secțiuni pentru publicare controlată.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200"
              >
                Închide
              </button>
            </div>

            <div className="border-b border-white/10 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {createSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setCreateSection(section.id)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      createSection === section.id
                        ? "bg-cyan-500/30 text-cyan-100"
                        : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-4">
              {createSection === "general" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Titlu curs *</span>
                    <input
                      value={createForm.title}
                      onChange={(event) => handleCreateChange("title", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="Ex: Python pentru începători"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Slug</span>
                    <input
                      value={createForm.slug}
                      onChange={(event) => handleCreateChange("slug", toSlug(event.target.value))}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="python-pentru-incepatori"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className="text-gray-300">Descriere</span>
                    <textarea
                      value={createForm.description}
                      onChange={(event) => handleCreateChange("description", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="Descrie ce va învăța elevul în acest curs."
                    />
                  </label>

                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className="text-gray-300">Imagine cover (upload fișier)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleThumbnailFileChange(file);
                      }}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-cyan-100"
                    />
                    {createForm.thumbnailUrl && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="mb-2 text-xs text-gray-300">Preview</p>
                        <img
                          src={createForm.thumbnailUrl}
                          alt="Preview cover"
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      </div>
                    )}
                  </label>
                </div>
              )}

              {createSection === "structure" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Nivel</span>
                    <select
                      value={createForm.level}
                      onChange={(event) => handleCreateChange("level", event.target.value as CreateCourseForm["level"])}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Limbă curs</span>
                    <input
                      value={createForm.language}
                      onChange={(event) => handleCreateChange("language", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="ro"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Durată estimată (ore)</span>
                    <input
                      value={createForm.estimatedHours}
                      onChange={(event) => handleCreateChange("estimatedHours", event.target.value.replace(/[^0-9.]/g, ""))}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="2"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Nivel minim recomandat</span>
                    <input
                      value={createForm.requiredLevel}
                      onChange={(event) => handleCreateChange("requiredLevel", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="Ex: baza în programare"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className="text-gray-300">Folder/Modul (opțional)</span>
                    <select
                      value={createForm.groupId}
                      onChange={(event) => handleCreateChange("groupId", event.target.value)}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">Fără folder/modul</option>
                      {groupOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.title} ({group.kind})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {createSection === "publish" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Vizibilitate curs</span>
                    <select
                      value={createForm.visibility}
                      onChange={(event) => handleCreateChange("visibility", event.target.value as CreateCourseForm["visibility"])}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                    {createForm.visibility === "PUBLISHED"
                      ? "Cursul va apărea automat în pagina principală de cursuri și în dashboard-ul elevilor pentru enroll."
                      : "Cursul nu va fi public până când nu este setat pe Published."}
                  </div>
                </div>
              )}

              {createSection === "catalog" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Obiective (câte unul pe linie)</span>
                    <textarea
                      value={createForm.objectives}
                      onChange={(event) => handleCreateChange("objectives", event.target.value)}
                      rows={5}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder={"Înțelegerea conceptelor de bază\nRezolvarea exercițiilor practice"}
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Public țintă (câte unul pe linie)</span>
                    <textarea
                      value={createForm.targetAudience}
                      onChange={(event) => handleCreateChange("targetAudience", event.target.value)}
                      rows={5}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder={"Elevi de liceu\nÎncepători în IT"}
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Prerequisites (câte unul pe linie)</span>
                    <textarea
                      value={createForm.prerequisites}
                      onChange={(event) => handleCreateChange("prerequisites", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder={"Cont pe platformă\nNoțiuni de bază PC"}
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="text-gray-300">Mesaj de bun venit</span>
                    <textarea
                      value={createForm.welcomeMessage}
                      onChange={(event) => handleCreateChange("welcomeMessage", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                      placeholder="Bine ai venit! Începem cu bazele și mergem progresiv către practică."
                    />
                  </label>
                </div>
              )}

              {createError && (
                <div className="rounded-2xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">
                  {createError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <p className="text-xs text-gray-300">
                Cursurile create apar în "Pipeline conținut". Dacă statusul este Published, apar și în catalogul public.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-gray-200"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleCreateCourse}
                  disabled={createSubmitting}
                  className="h-10 rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createSubmitting ? "Se creează..." : "Creează cursul"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
