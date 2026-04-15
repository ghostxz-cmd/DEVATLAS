import { NextResponse } from "next/server";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    full_name?: string;
    role?: string;
    avatar_url?: string;
    timezone?: string;
  };
};

type InstructorAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  status: string;
  created_at: string;
};

type AppUserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
  full_name: string;
};

type InstructorProfileRow = {
  instructor_account_id: string;
  phone: string | null;
  title: string | null;
  bio: string | null;
  expertise: string[];
  can_manage_courses: boolean;
  can_manage_content: boolean;
  can_review_submissions: boolean;
  can_manage_students: boolean;
  can_view_support: boolean;
  is_supervisor: boolean;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  level: string;
  category_id: string | null;
  thumbnail_url: string | null;
  estimated_mins: number | null;
  visibility: string;
  created_by: string;
  created_at: string;
};

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  is_published: boolean;
  estimated_minutes: number;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
};

type SubmissionRow = {
  id: string;
  lesson_id: string;
  score: number | null;
  verdict: string;
  created_at: string;
};

type CourseCategoryRow = {
  id: string;
  slug: string;
  name: string;
};

type InstructorActivityRow = {
  id: string;
  instructor_account_id: string;
  activity_type: string;
  activity_payload: Record<string, unknown> | null;
  created_at: string;
};

type InstructorProfile = {
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

type CourseSummary = {
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
};

type ActivityItem = {
  kind: string;
  title: string;
  detail: string;
  createdAt: string;
};

type DashboardOverview = {
  profile: InstructorProfile;
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
  courses: CourseSummary[];
  activityFeed: ActivityItem[];
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

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function fetchRows<T>(supabaseUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...getSupabaseHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function fetchSingleRow<T>(supabaseUrl: string, path: string) {
  const rows = await fetchRows<T>(supabaseUrl, path);
  return rows[0] ?? null;
}

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toUpperCase();
}

function normalizeLevel(level: string) {
  return level.toLowerCase().replaceAll("_", " ");
}

function getActivityTitle(activityType: string) {
  return activityType
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Missing or invalid authorization header." }, { status: 401 });
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        ...getSupabaseHeaders(),
        Authorization: authorization,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ message: "Unauthorized instructor session." }, { status: 401 });
    }

    const authedUser = (await userResponse.json()) as AuthUserResponse;
    const role = normalizeRole(authedUser.user_metadata?.role);

    if (role !== "INSTRUCTOR") {
      return NextResponse.json({ message: "Instructor dashboard access only." }, { status: 403 });
    }

    const email = (authedUser.email ?? "").trim().toLowerCase();

    const account =
      (await fetchSingleRow<InstructorAccountRow>(
        supabaseUrl,
        `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status,created_at&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
      )) ??
      (email
        ? await fetchSingleRow<InstructorAccountRow>(
            supabaseUrl,
            `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status,created_at&email=eq.${encodeURIComponent(email)}&limit=1`,
          )
        : null);

    if (!account || account.status !== "ACTIVE") {
      return NextResponse.json({ message: "Instructor account not found." }, { status: 404 });
    }

    const profile = await fetchSingleRow<InstructorProfileRow>(
      supabaseUrl,
      `instructor_profiles?select=instructor_account_id,phone,title,bio,expertise,can_manage_courses,can_manage_content,can_review_submissions,can_manage_students,can_view_support,is_supervisor&instructor_account_id=eq.${encodeURIComponent(account.id)}&limit=1`,
    );

    let appUser =
      (await fetchSingleRow<AppUserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email,full_name&supabase_auth_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
      )) ??
      (email
        ? await fetchSingleRow<AppUserRow>(
            supabaseUrl,
            `users?select=id,supabase_auth_id,email,full_name&email=eq.${encodeURIComponent(email)}&limit=1`,
          )
        : null);

    if (!appUser && email) {
      try {
        const createdRows = await fetchRows<AppUserRow>(supabaseUrl, "users", {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            supabase_auth_id: authedUser.id,
            email,
            full_name: account.full_name,
            role: "INSTRUCTOR",
            status: "ACTIVE",
          }),
        });
        appUser = createdRows[0] ?? null;
      } catch {
        appUser = await fetchSingleRow<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name&email=eq.${encodeURIComponent(email)}&limit=1`,
        );
      }
    }

    const coursesPath = appUser?.id
      ? `courses?select=id,slug,title,level,category_id,thumbnail_url,estimated_mins,visibility,created_by,created_at&created_by=eq.${encodeURIComponent(appUser.id)}&order=created_at.desc&limit=250`
      : "courses?select=id,slug,title,level,category_id,thumbnail_url,estimated_mins,visibility,created_by,created_at&id=is.null&limit=1";

    const [courses, lessons, enrollments, submissions, categories, activityRows] = await Promise.all([
      fetchRows<CourseRow>(supabaseUrl, coursesPath),
      fetchRows<LessonRow>(supabaseUrl, "lessons?select=id,course_id,title,position,is_published,estimated_minutes&order=course_id.asc,position.asc&limit=2000"),
      fetchRows<EnrollmentRow>(supabaseUrl, "enrollments?select=id,user_id,course_id,status,enrolled_at&order=enrolled_at.desc&limit=4000"),
      fetchRows<SubmissionRow>(supabaseUrl, "submissions?select=id,lesson_id,score,verdict,created_at&score=not.is.null&order=created_at.desc&limit=4000"),
      fetchRows<CourseCategoryRow>(supabaseUrl, "course_categories?select=id,slug,name&order=name.asc&limit=100"),
      fetchRows<InstructorActivityRow>(supabaseUrl, `instructor_activity_logs?select=id,instructor_account_id,activity_type,activity_payload,created_at&instructor_account_id=eq.${encodeURIComponent(account.id)}&order=created_at.desc&limit=100`),
    ]);

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const lessonMap = new Map<string, LessonRow[]>();
    const lessonById = new Map<string, LessonRow>(lessons.map((lesson) => [lesson.id, lesson]));
    const enrollmentMap = new Map<string, EnrollmentRow[]>();
    const feedbackMap = new Map<string, SubmissionRow[]>();

    for (const lesson of lessons) {
      const bucket = lessonMap.get(lesson.course_id) ?? [];
      bucket.push(lesson);
      lessonMap.set(lesson.course_id, bucket);
    }

    for (const enrollment of enrollments) {
      const bucket = enrollmentMap.get(enrollment.course_id) ?? [];
      bucket.push(enrollment);
      enrollmentMap.set(enrollment.course_id, bucket);
    }

    for (const submission of submissions) {
      const lesson = lessonById.get(submission.lesson_id);
      if (!lesson || submission.score === null) {
        continue;
      }

      const bucket = feedbackMap.get(lesson.course_id) ?? [];
      bucket.push(submission);
      feedbackMap.set(lesson.course_id, bucket);
    }

    const courseSummaries: CourseSummary[] = courses.map((course) => {
      const courseLessons = lessonMap.get(course.id) ?? [];
      const courseEnrollments = enrollmentMap.get(course.id) ?? [];
      const courseFeedback = feedbackMap.get(course.id) ?? [];
      const uniqueStudents = new Set(courseEnrollments.map((item) => item.user_id)).size;
      const averageRating = courseFeedback.length > 0
        ? Math.round((courseFeedback.reduce((sum, item) => sum + (item.score ?? 0), 0) / courseFeedback.length) * 10) / 10
        : null;
      const category = course.category_id ? categoryMap.get(course.category_id) ?? null : null;

      return {
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        level: normalizeLevel(course.level),
        category: category?.name ?? null,
        thumbnailUrl: course.thumbnail_url ?? null,
        estimatedMins: course.estimated_mins ?? null,
        createdAt: course.created_at,
        visibility: course.visibility,
        lessonCount: courseLessons.length,
        enrollmentCount: courseEnrollments.length,
        studentCount: uniqueStudents,
        averageRating,
        reviewCount: courseFeedback.length,
        status: (course.visibility === "DRAFT" ? "DRAFT" : course.visibility === "IN_REVIEW" ? "IN_REVIEW" : "PUBLISHED") as "PUBLISHED" | "DRAFT" | "IN_REVIEW",
      };
    });

    const activeCourses = courseSummaries.filter((course) => course.status === "PUBLISHED").length;
    const draftCourses = courseSummaries.filter((course) => course.status === "DRAFT").length;
    const reviewCourses = courseSummaries.filter((course) => course.status === "IN_REVIEW").length;
    const totalLessons = courseSummaries.reduce((sum, course) => sum + course.lessonCount, 0);
    const totalStudents = new Set(
      courseSummaries.flatMap((course) => (enrollmentMap.get(course.courseId) ?? []).map((item) => item.user_id)),
    ).size;

    const allFeedback = courseSummaries.flatMap((course) => feedbackMap.get(course.courseId) ?? []);
    const averageFeedback = allFeedback.length > 0
      ? Math.round((allFeedback.reduce((sum, item) => sum + (item.score ?? 0), 0) / allFeedback.length) * 10) / 10
      : 0;

    const profileCompletion = Math.round(
      [account.full_name, account.email, account.timezone, account.avatar_url, profile?.title].filter(Boolean).length / 5 * 100,
    );

    const activityFeed = [
      ...activityRows.slice(0, 6).map((item) => ({
        kind: "log",
        title: getActivityTitle(item.activity_type),
        detail: item.activity_payload ? JSON.stringify(item.activity_payload).slice(0, 120) : "Activitate de cont înregistrată.",
        createdAt: item.created_at,
      })),
      ...courseSummaries.slice(0, 4).map((course) => ({
        kind: "course",
        title: course.title,
        detail: `${course.lessonCount} lecții • ${course.studentCount} studenți • ${course.reviewCount} feedback-uri`,
        createdAt: course.createdAt,
      })),
      ...allFeedback.slice(0, 4).map((submission) => ({
        kind: "review",
        title: `Feedback ${submission.score ?? 0}/5`,
        detail: submission.verdict ? `Verdict: ${submission.verdict}` : "Feedback înregistrat din platformă.",
        createdAt: submission.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const feedbackSummary = courseSummaries
      .filter((course) => course.reviewCount > 0)
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, 5)
      .map((course) => ({
        courseId: course.courseId,
        courseTitle: course.title,
        rating: course.averageRating ?? 0,
        reviewCount: course.reviewCount,
      }));

    const recommendations: DashboardOverview["recommendations"] = [];

    if (!profile?.title) {
      recommendations.push({
        kind: "profile",
        title: "Completează titlul profesional",
        description: "Adaugă un titlu clar pentru a face profilul mai lizibil în administrare și în dashboard.",
        reason: "Lipsește titlul de instructor",
      });
    }

    if (!profile?.expertise?.length) {
      recommendations.push({
        kind: "profile",
        title: "Setează expertiza",
        description: "Adaugă competențele principale ca să poți organiza mai bine cursurile și conținutul.",
        reason: "Lipsește expertiza",
      });
    }

    if (courseSummaries.length === 0) {
      recommendations.push({
        kind: "course",
        title: "Publică primul curs",
        description: "Nu există încă materiale create de acest cont. Creează primul curs și începe să-l structurezi.",
        reason: "Nu există cursuri proprii",
      });
    } else {
      const weakestCourse = [...courseSummaries].sort((a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0))[0];
      if (weakestCourse && weakestCourse.reviewCount > 0 && (weakestCourse.averageRating ?? 0) < 4) {
        recommendations.push({
          kind: "feedback",
          title: `Îmbunătățește ${weakestCourse.title}`,
          description: "Acesta este cursul cu cel mai slab feedback. Verifică structura lecțiilor și actualizează conținutul.",
          reason: "Feedback sub 4 stele",
        });
      }
    }

    if (averageFeedback > 0 && averageFeedback < 4.5) {
      recommendations.push({
        kind: "quality",
        title: "Urmărește trendul feedback-ului",
        description: "Ai un scor bun, dar există spațiu pentru ajustări. Folosește review-urile recente pentru optimizare.",
        reason: "Feedback mediu sub 4.5",
      });
    }

    if (activityFeed.length < 3) {
      recommendations.push({
        kind: "activity",
        title: "Generează activitate în cont",
        description: "Dashboard-ul are puține evenimente recente. Actualizează cursuri sau profilul pentru un feed mai bogat.",
        reason: "Prea puțină activitate recentă",
      });
    }

    return NextResponse.json({
      profile: {
        fullName: account.full_name,
        email: account.email,
        avatarUrl: account.avatar_url,
        timezone: account.timezone,
        status: account.status,
        completionPercent: profileCompletion,
        title: profile?.title ?? null,
        expertise: profile?.expertise ?? [],
        hasProfileRecord: Boolean(profile),
      },
      summary: {
        coursesActive: activeCourses,
        coursesDraft: draftCourses,
        coursesInReview: reviewCourses,
        totalCourses: courseSummaries.length,
        totalStudents,
        totalLessons,
        averageFeedback,
        recentActivityCount: activityFeed.length,
        profileCompletion,
      },
      courses: courseSummaries,
      activityFeed,
      feedbackSummary,
      recommendations,
    } satisfies DashboardOverview);
  } catch (error) {
    console.error("Instructor dashboard error:", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unexpected instructor dashboard error.",
      },
      { status: 500 },
    );
  }
}
