import { NextResponse } from "next/server";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
  };
};

type InstructorAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  status: string;
};

type AppUserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
  full_name: string;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  visibility: string;
  estimated_mins: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

type LessonRow = {
  id: string;
  title: string;
  is_published: boolean;
  position: number;
  estimated_minutes: number;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  status: string;
  enrolled_at: string;
  updated_at: string;
};

type ProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  completion_percent: number;
  status: string;
  last_activity_at: string | null;
  time_spent_seconds: number;
};

type SubmissionRow = {
  id: string;
  lesson_id: string;
  score: number | null;
  created_at: string;
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
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
    cache: "no-store",
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

function toDayKey(dateValue: string) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function formatLevel(level: string) {
  return level.toLowerCase().replaceAll("_", " ");
}

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
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
    if (normalizeRole(authedUser.user_metadata?.role) !== "INSTRUCTOR") {
      return NextResponse.json({ message: "Instructor dashboard access only." }, { status: 403 });
    }

    const email = (authedUser.email ?? "").trim().toLowerCase();

    const account =
      (await fetchSingleRow<InstructorAccountRow>(
        supabaseUrl,
        `instructor_accounts?select=id,auth_user_id,email,full_name,status&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
      )) ??
      (email
        ? await fetchSingleRow<InstructorAccountRow>(
            supabaseUrl,
            `instructor_accounts?select=id,auth_user_id,email,full_name,status&email=eq.${encodeURIComponent(email)}&limit=1`,
          )
        : null);

    if (!account || account.status !== "ACTIVE") {
      return NextResponse.json({ message: "Instructor account not found." }, { status: 404 });
    }

    const appUser =
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

    if (!appUser) {
      return NextResponse.json({ message: "Instructor user mapping missing." }, { status: 404 });
    }

    const course = await fetchSingleRow<CourseRow>(
      supabaseUrl,
      `courses?select=id,slug,title,description,level,visibility,estimated_mins,created_at,updated_at,created_by&id=eq.${encodeURIComponent(courseId)}&limit=1`,
    );

    if (!course) {
      return NextResponse.json({ message: "Cursul nu există." }, { status: 404 });
    }

    if (course.created_by !== appUser.id) {
      return NextResponse.json({ message: "Nu ai acces la acest curs." }, { status: 403 });
    }

    const [lessons, enrollments, progressRows] = await Promise.all([
      fetchRows<LessonRow>(
        supabaseUrl,
        `lessons?select=id,title,is_published,position,estimated_minutes&course_id=eq.${encodeURIComponent(course.id)}&order=position.asc&limit=1000`,
      ),
      fetchRows<EnrollmentRow>(
        supabaseUrl,
        `enrollments?select=id,user_id,status,enrolled_at,updated_at&course_id=eq.${encodeURIComponent(course.id)}&order=enrolled_at.desc&limit=5000`,
      ),
      fetchRows<ProgressRow>(
        supabaseUrl,
        `progress?select=id,user_id,lesson_id,completion_percent,status,last_activity_at,time_spent_seconds&course_id=eq.${encodeURIComponent(course.id)}&order=last_activity_at.desc.nullslast&limit=10000`,
      ),
    ]);

    const lessonIds = lessons.map((lesson) => lesson.id);
    const submissions = lessonIds.length > 0
      ? await fetchRows<SubmissionRow>(
          supabaseUrl,
          `submissions?select=id,lesson_id,score,created_at&lesson_id=in.(${lessonIds.map((id) => encodeURIComponent(id)).join(",")})&score=not.is.null&order=created_at.desc&limit=5000`,
        )
      : [];

    const studentIds = Array.from(new Set(enrollments.map((item) => item.user_id)));
    const students = studentIds.length > 0
      ? await fetchRows<UserRow>(
          supabaseUrl,
          `users?select=id,full_name,email&id=in.(${studentIds.map((id) => encodeURIComponent(id)).join(",")})&limit=5000`,
        )
      : [];

    const studentMap = new Map(students.map((student) => [student.id, student]));

    const feedbackCount = submissions.length;
    const averageScore = feedbackCount > 0
      ? Math.round((submissions.reduce((sum, item) => sum + (item.score ?? 0), 0) / feedbackCount) * 10) / 10
      : 0;

    const publishedLessons = lessons.filter((lesson) => lesson.is_published).length;
    const activeEnrollments = enrollments.filter((item) => item.status === "ACTIVE").length;
    const uniqueStudents = new Set(enrollments.map((item) => item.user_id)).size;

    const progressByStudent = new Map<string, ProgressRow[]>();
    for (const row of progressRows) {
      const bucket = progressByStudent.get(row.user_id) ?? [];
      bucket.push(row);
      progressByStudent.set(row.user_id, bucket);
    }

    const completionByStudent = Array.from(progressByStudent.entries()).map(([userId, rows]) => {
      const totalLessons = Math.max(lessons.length, rows.length, 1);
      const completion = Math.round(rows.reduce((sum, item) => sum + item.completion_percent, 0) / totalLessons);
      return { userId, completion };
    });

    const averageProgress = completionByStudent.length > 0
      ? Math.round(completionByStudent.reduce((sum, item) => sum + item.completion, 0) / completionByStudent.length)
      : 0;

    const completedStudents = completionByStudent.filter((item) => item.completion >= 100).length;
    const completionRate = uniqueStudents > 0 ? Math.round((completedStudents / uniqueStudents) * 100) : 0;

    const today = new Date();
    const enrollmentByDay = new Map<string, number>();
    for (const row of enrollments) {
      const key = toDayKey(row.enrolled_at);
      enrollmentByDay.set(key, (enrollmentByDay.get(key) ?? 0) + 1);
    }

    const dailyActivityByDay = new Map<string, number>();
    for (const row of progressRows) {
      if (!row.last_activity_at) {
        continue;
      }
      const key = toDayKey(row.last_activity_at);
      dailyActivityByDay.set(key, (dailyActivityByDay.get(key) ?? 0) + 1);
    }

    const chartRange = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: key.slice(5),
        enrollments: enrollmentByDay.get(key) ?? 0,
        activity: dailyActivityByDay.get(key) ?? 0,
      };
    });

    const recentStudents = enrollments.slice(0, 8).map((row) => ({
      userId: row.user_id,
      name: studentMap.get(row.user_id)?.full_name ?? "Student",
      email: studentMap.get(row.user_id)?.email ?? "-",
      enrolledAt: row.enrolled_at,
      status: row.status,
      completion: completionByStudent.find((item) => item.userId === row.user_id)?.completion ?? 0,
    }));

    const statusBreakdown = {
      active: enrollments.filter((row) => row.status === "ACTIVE").length,
      completed: enrollments.filter((row) => row.status === "COMPLETED").length,
      paused: enrollments.filter((row) => row.status === "PAUSED").length,
      dropped: enrollments.filter((row) => row.status === "DROPPED").length,
    };

    const completionDistribution = {
      beginner: completionByStudent.filter((item) => item.completion < 25).length,
      steady: completionByStudent.filter((item) => item.completion >= 25 && item.completion < 60).length,
      advanced: completionByStudent.filter((item) => item.completion >= 60 && item.completion < 100).length,
      completed: completionByStudent.filter((item) => item.completion >= 100).length,
    };

    const scoreDistribution = {
      weak: submissions.filter((item) => (item.score ?? 0) < 50).length,
      medium: submissions.filter((item) => (item.score ?? 0) >= 50 && (item.score ?? 0) < 75).length,
      strong: submissions.filter((item) => (item.score ?? 0) >= 75 && (item.score ?? 0) < 90).length,
      excellent: submissions.filter((item) => (item.score ?? 0) >= 90).length,
    };

    const progressByLesson = new Map<string, ProgressRow[]>();
    for (const row of progressRows) {
      const bucket = progressByLesson.get(row.lesson_id) ?? [];
      bucket.push(row);
      progressByLesson.set(row.lesson_id, bucket);
    }

    const lessonEngagement = lessons.map((lesson) => {
      const rows = progressByLesson.get(lesson.id) ?? [];
      const learners = new Set(rows.map((row) => row.user_id)).size;
      const avgCompletion = rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.completion_percent, 0) / rows.length)
        : 0;

      return {
        lessonId: lesson.id,
        title: lesson.title,
        learners,
        avgCompletion,
        estimatedMinutes: lesson.estimated_minutes,
      };
    });

    const topLessons = [...lessonEngagement]
      .sort((a, b) => {
        if (b.learners !== a.learners) {
          return b.learners - a.learners;
        }
        return b.avgCompletion - a.avgCompletion;
      })
      .slice(0, 6);

    const learningMinutesByDay = new Map<string, number>();
    for (const row of progressRows) {
      if (!row.last_activity_at) {
        continue;
      }

      const key = toDayKey(row.last_activity_at);
      learningMinutesByDay.set(key, (learningMinutesByDay.get(key) ?? 0) + Math.round(row.time_spent_seconds / 60));
    }

    const timeRange14d = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: key.slice(5),
        minutes: learningMinutesByDay.get(key) ?? 0,
      };
    });

    const totalTimeMinutes = timeRange14d.reduce((sum, item) => sum + item.minutes, 0);
    const averageTimePerActiveStudent = activeEnrollments > 0 ? Math.round(totalTimeMinutes / activeEnrollments) : 0;

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: formatLevel(course.level),
        visibility: course.visibility,
        estimatedMins: course.estimated_mins,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
      kpis: {
        totalStudents: uniqueStudents,
        activeStudents: activeEnrollments,
        totalLessons: lessons.length,
        publishedLessons,
        averageScore,
        feedbackCount,
        averageProgress,
        completionRate,
      },
      chartRange,
      recentStudents,
      statusBreakdown,
      insights: {
        completionDistribution,
        scoreDistribution,
        topLessons,
        timeRange14d,
        totalTimeMinutes,
        averageTimePerActiveStudent,
      },
      lessonSnapshot: lessons.slice(0, 8).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        isPublished: lesson.is_published,
        estimatedMinutes: lesson.estimated_minutes,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load course management data." },
      { status: 500 },
    );
  }
}
