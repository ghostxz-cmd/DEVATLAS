import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type StudentAccountRow = {
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
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  status: string;
  enrolled_at: string;
  updated_at: string;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
  is_published: boolean;
  estimated_minutes: number;
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

async function fetchRows<T>(supabaseUrl: string, path: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(),
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

    const cookieStore = await cookies();
    const token = cookieStore.get(getStudentSessionCookieName())?.value;
    const session = verifyStudentSessionToken(token);

    if (!session) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const student = await fetchSingleRow<StudentAccountRow>(
      supabaseUrl,
      `student_accounts?select=id,auth_user_id,email,full_name,status&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
    );

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const userByAuth = student.auth_user_id
      ? await fetchSingleRow<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name&supabase_auth_id=eq.${encodeURIComponent(student.auth_user_id)}&limit=1`,
        )
      : null;

    const userByEmail = userByAuth
      ? null
      : await fetchSingleRow<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name&email=eq.${encodeURIComponent(student.email.toLowerCase())}&limit=1`,
        );

    const appUser = userByAuth ?? userByEmail;
    if (!appUser) {
      return NextResponse.json({ message: "Student user mapping missing." }, { status: 404 });
    }

    const course = await fetchSingleRow<CourseRow>(
      supabaseUrl,
      `courses?select=id,slug,title,description,level,visibility,estimated_mins,created_at,updated_at&id=eq.${encodeURIComponent(courseId)}&visibility=neq.DRAFT&limit=1`,
    );

    if (!course) {
      return NextResponse.json({ message: "Cursul nu există sau este draft." }, { status: 404 });
    }

    const [enrollments, lessons, progressRows] = await Promise.all([
      fetchRows<EnrollmentRow>(
        supabaseUrl,
        `enrollments?select=id,user_id,status,enrolled_at,updated_at&course_id=eq.${encodeURIComponent(course.id)}&order=enrolled_at.desc&limit=5000`,
      ),
      fetchRows<LessonRow>(
        supabaseUrl,
        `lessons?select=id,title,position,is_published,estimated_minutes&course_id=eq.${encodeURIComponent(course.id)}&is_published=eq.true&order=position.asc&limit=2000`,
      ),
      fetchRows<ProgressRow>(
        supabaseUrl,
        `progress?select=id,user_id,lesson_id,completion_percent,status,last_activity_at,time_spent_seconds&course_id=eq.${encodeURIComponent(course.id)}&order=last_activity_at.desc.nullslast&limit=20000`,
      ),
    ]);

    const myEnrollment = enrollments.find((item) => item.user_id === appUser.id) ?? null;
    if (!myEnrollment) {
      return NextResponse.json({ message: "Nu ești enrolled la acest curs." }, { status: 403 });
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const submissions = lessonIds.length > 0
      ? await fetchRows<SubmissionRow>(
          supabaseUrl,
          `submissions?select=id,score,created_at&lesson_id=in.(${lessonIds.map((id) => encodeURIComponent(id)).join(",")})&score=not.is.null&limit=10000`,
        )
      : [];

    const studentIds = Array.from(new Set(enrollments.map((item) => item.user_id)));
    const studentRows = studentIds.length > 0
      ? await fetchRows<UserRow>(
          supabaseUrl,
          `users?select=id,full_name,email&id=in.(${studentIds.map((id) => encodeURIComponent(id)).join(",")})&limit=5000`,
        )
      : [];
    const studentMap = new Map(studentRows.map((row) => [row.id, row]));

    const progressByUser = new Map<string, ProgressRow[]>();
    for (const row of progressRows) {
      const bucket = progressByUser.get(row.user_id) ?? [];
      bucket.push(row);
      progressByUser.set(row.user_id, bucket);
    }

    const progressByLesson = new Map<string, ProgressRow>();
    for (const row of progressRows) {
      if (row.user_id !== appUser.id) {
        continue;
      }
      const current = progressByLesson.get(row.lesson_id);
      if (!current || (row.last_activity_at ?? "") > (current.last_activity_at ?? "")) {
        progressByLesson.set(row.lesson_id, row);
      }
    }

    const totalLessons = lessons.length;
    const myRows = progressByUser.get(appUser.id) ?? [];
    const myCompletedLessons = myRows.filter((row) => row.completion_percent >= 100 || row.status === "completed").length;
    const myProgressPercent = totalLessons > 0
      ? Math.round(myRows.reduce((sum, row) => sum + row.completion_percent, 0) / totalLessons)
      : 0;

    const myLastActivity = myRows.reduce<string | null>((latest, row) => {
      if (!row.last_activity_at) {
        return latest;
      }
      if (!latest || new Date(row.last_activity_at).getTime() > new Date(latest).getTime()) {
        return row.last_activity_at;
      }
      return latest;
    }, null);

    const nextLesson = lessons.find((lesson) => {
      const progress = progressByLesson.get(lesson.id);
      return !progress || progress.completion_percent < 100;
    });

    const totalStudents = new Set(enrollments.map((item) => item.user_id)).size;
    const activeStudents = enrollments.filter((item) => item.status === "ACTIVE").length;

    const completionByStudent = Array.from(progressByUser.entries()).map(([userId, rows]) => {
      const completion = totalLessons > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.completion_percent, 0) / totalLessons)
        : 0;
      return { userId, completion };
    });

    const classAverageProgress = completionByStudent.length > 0
      ? Math.round(completionByStudent.reduce((sum, item) => sum + item.completion, 0) / completionByStudent.length)
      : 0;

    const classCompleted = completionByStudent.filter((item) => item.completion >= 100).length;
    const classCompletionRate = totalStudents > 0 ? Math.round((classCompleted / totalStudents) * 100) : 0;

    const averageScore = submissions.length > 0
      ? Math.round((submissions.reduce((sum, item) => sum + (item.score ?? 0), 0) / submissions.length) * 10) / 10
      : 0;

    const enrollmentByDay = new Map<string, number>();
    for (const row of enrollments) {
      const key = toDayKey(row.enrolled_at);
      enrollmentByDay.set(key, (enrollmentByDay.get(key) ?? 0) + 1);
    }

    const classActivityByDay = new Map<string, number>();
    const studentActivityByDay = new Map<string, number>();
    for (const row of progressRows) {
      if (!row.last_activity_at) {
        continue;
      }
      const key = toDayKey(row.last_activity_at);
      classActivityByDay.set(key, (classActivityByDay.get(key) ?? 0) + 1);
      if (row.user_id === appUser.id) {
        studentActivityByDay.set(key, (studentActivityByDay.get(key) ?? 0) + 1);
      }
    }

    const today = new Date();
    const chartRange = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: key.slice(5),
        classEnrollments: enrollmentByDay.get(key) ?? 0,
        classActivity: classActivityByDay.get(key) ?? 0,
        myActivity: studentActivityByDay.get(key) ?? 0,
      };
    });

    const topClassStudents = completionByStudent
      .map((item) => ({
        userId: item.userId,
        completion: item.completion,
        name: studentMap.get(item.userId)?.full_name ?? "Elev",
        email: studentMap.get(item.userId)?.email ?? "-",
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 6);

    const totalTimeMinutes = myRows.reduce((sum, row) => sum + Math.round(row.time_spent_seconds / 60), 0);

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
      myStats: {
        enrolledAt: myEnrollment.enrolled_at,
        status: myEnrollment.status,
        progressPercent: myProgressPercent,
        completedLessons: myCompletedLessons,
        totalLessons,
        nextLessonTitle: nextLesson?.title ?? null,
        lastActivityAt: myLastActivity,
        totalTimeMinutes,
      },
      classStats: {
        totalStudents,
        activeStudents,
        averageProgress: classAverageProgress,
        completionRate: classCompletionRate,
        averageScore,
        feedbackCount: submissions.length,
      },
      chartRange,
      topClassStudents,
      sectionHints: {
        catalog: "Catalogul clasei (note, scoruri și progres) va fi gestionat în această secțiune.",
        cameraOnline: "Camera online va centraliza prezență, sesiuni live și replay-uri.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load student course dashboard." },
      { status: 500 },
    );
  }
}
