import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type StudentAccountRow = {
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
  avatar_url: string | null;
  timezone: string | null;
  role: string;
  status: string;
  created_at: string;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
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

type ProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completion_percent: number;
  status: string;
  last_activity_at: string | null;
  time_spent_seconds: number;
  created_at: string;
};

type XpLedgerRow = {
  id: string;
  user_id: string;
  action_type: string;
  points: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  payload_json: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type SupportTicketRow = {
  id: string;
  public_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  last_message_at: string;
};

type UserAchievementRow = {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
};

type AchievementRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  xp_reward: number;
  badge_image_url: string | null;
};

type CourseCategoryRow = {
  id: string;
  slug: string;
  name: string;
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
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

function toDateKey(dateValue: string) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function formatLevel(level: string) {
  return level.toLowerCase().replaceAll("_", " ");
}

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const token = cookieStore.get(getStudentSessionCookieName())?.value;
    const session = verifyStudentSessionToken(token);

    if (!session) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const studentRows = await fetchRows<StudentAccountRow>(
      supabaseUrl,
      `student_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status,created_at&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
    );
    const student = studentRows[0] ?? null;

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const userByAuthRows = student.auth_user_id
      ? await fetchRows<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name,avatar_url,timezone,role,status,created_at&supabase_auth_id=eq.${encodeURIComponent(student.auth_user_id)}&limit=1`,
        )
      : [];

    const userByEmailRows = userByAuthRows.length > 0
      ? []
      : await fetchRows<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name,avatar_url,timezone,role,status,created_at&email=eq.${encodeURIComponent(student.email.toLowerCase())}&limit=1`,
        );

    const user = userByAuthRows[0] ?? userByEmailRows[0] ?? null;
    const userId = user?.id ?? null;

    const [
      enrollments,
      progressRows,
      courses,
      lessons,
      xpRows,
      notifications,
      supportTickets,
      achievements,
      userAchievements,
      categories,
    ] = await Promise.all([
      userId
        ? fetchRows<EnrollmentRow>(supabaseUrl, `enrollments?select=id,user_id,course_id,status,enrolled_at&user_id=eq.${encodeURIComponent(userId)}&order=enrolled_at.desc&limit=100`)
        : Promise.resolve([] as EnrollmentRow[]),
      userId
        ? fetchRows<ProgressRow>(supabaseUrl, `progress?select=id,user_id,course_id,lesson_id,completion_percent,status,last_activity_at,time_spent_seconds,created_at&user_id=eq.${encodeURIComponent(userId)}&order=last_activity_at.desc.nullslast&limit=500`)
        : Promise.resolve([] as ProgressRow[]),
      fetchRows<CourseRow>(supabaseUrl, `courses?select=id,slug,title,level,category_id,thumbnail_url,estimated_mins,visibility,created_at&visibility=eq.PUBLISHED&order=created_at.desc&limit=200`),
      fetchRows<LessonRow>(supabaseUrl, `lessons?select=id,course_id,title,position,is_published,estimated_minutes&is_published=eq.true&order=course_id.asc,position.asc&limit=1000`),
      userId
        ? fetchRows<XpLedgerRow>(supabaseUrl, `xp_ledger?select=id,user_id,action_type,points,metadata_json,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=250`)
        : Promise.resolve([] as XpLedgerRow[]),
      userId
        ? fetchRows<NotificationRow>(supabaseUrl, `notifications?select=id,user_id,type,title,message,payload_json,read_at,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50`)
        : Promise.resolve([] as NotificationRow[]),
      fetchRows<SupportTicketRow>(supabaseUrl, `support_tickets?select=id,public_id,subject,status,priority,created_at,last_message_at&requester_email=eq.${encodeURIComponent(student.email.toLowerCase())}&order=last_message_at.desc&limit=20`),
      userId
        ? fetchRows<AchievementRow>(supabaseUrl, `achievements?select=id,code,name,description,xp_reward,badge_image_url&order=created_at.desc&limit=100`)
        : Promise.resolve([] as AchievementRow[]),
      userId
        ? fetchRows<UserAchievementRow>(supabaseUrl, `user_achievements?select=id,user_id,achievement_id,earned_at&user_id=eq.${encodeURIComponent(userId)}&order=earned_at.desc&limit=100`)
        : Promise.resolve([] as UserAchievementRow[]),
      fetchRows<CourseCategoryRow>(supabaseUrl, `course_categories?select=id,slug,name&order=name.asc&limit=100`),
    ]);

    const courseMap = new Map(courses.map((course) => [course.id, course]));
    const lessonMap = new Map<string, LessonRow[]>();
    for (const lesson of lessons) {
      const bucket = lessonMap.get(lesson.course_id) ?? [];
      bucket.push(lesson);
      lessonMap.set(lesson.course_id, bucket);
    }

    const progressByCourse = new Map<string, ProgressRow[]>();
    const progressByLesson = new Map<string, ProgressRow>();
    for (const progress of progressRows) {
      const bucket = progressByCourse.get(progress.course_id) ?? [];
      bucket.push(progress);
      progressByCourse.set(progress.course_id, bucket);
      progressByLesson.set(progress.lesson_id, progress);
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const enrollmentCourseIds = [...new Set(enrollments.map((item) => item.course_id))];

    const courseCards = enrollmentCourseIds.map((courseId) => {
      const course = courseMap.get(courseId);
      const courseLessons = lessonMap.get(courseId) ?? [];
      const courseProgress = progressByCourse.get(courseId) ?? [];
      const totalLessons = courseLessons.length || courseProgress.length;
      const completedLessons = courseProgress.filter((item) => item.completion_percent >= 100 || item.status === "completed").length;
      const progressPercent = totalLessons > 0
        ? Math.round(courseProgress.reduce((sum, item) => sum + item.completion_percent, 0) / totalLessons)
        : 0;
      const lastActivityAt = courseProgress.reduce<string | null>((latest, item) => {
        if (!item.last_activity_at) {
          return latest;
        }

        if (!latest || new Date(item.last_activity_at).getTime() > new Date(latest).getTime()) {
          return item.last_activity_at;
        }

        return latest;
      }, null) ?? enrollments.find((item) => item.course_id === courseId)?.enrolled_at ?? course?.created_at ?? new Date().toISOString();

      const nextLesson = courseLessons.find((lesson) => {
        const progress = progressByLesson.get(lesson.id);
        return !progress || progress.completion_percent < 100;
      });

      const category = course?.category_id ? categoryMap.get(course.category_id) ?? null : null;

      return {
        courseId,
        title: course?.title ?? "Curs necunoscut",
        slug: course?.slug ?? courseId,
        level: course ? formatLevel(course.level) : "unknown",
        category: category?.name ?? null,
        thumbnailUrl: course?.thumbnail_url ?? null,
        estimatedMins: course?.estimated_mins ?? null,
        enrolledAt: enrollments.find((item) => item.course_id === courseId)?.enrolled_at ?? course?.created_at ?? new Date().toISOString(),
        progressPercent,
        completedLessons,
        totalLessons,
        lastActivityAt,
        nextLessonTitle: nextLesson?.title ?? null,
        status: enrollments.find((item) => item.course_id === courseId)?.status ?? "ACTIVE",
      };
    }).sort((a, b) => b.progressPercent - a.progressPercent);

    const totalXp = xpRows.reduce((sum, row) => sum + row.points, 0);

    const xpByDate = new Map<string, number>();
    for (const row of xpRows) {
      const dateKey = toDateKey(row.created_at);
      xpByDate.set(dateKey, (xpByDate.get(dateKey) ?? 0) + row.points);
    }

    const today = new Date();
    const xpChart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        label: key.slice(5),
        date: key,
        points: xpByDate.get(key) ?? 0,
      };
    });

    const activityFeed = [
      ...notifications.slice(0, 5).map((item) => ({
        kind: "notification",
        title: item.title,
        detail: item.message,
        createdAt: item.created_at,
      })),
      ...progressRows
        .filter((item) => item.last_activity_at)
        .slice(0, 5)
        .map((item) => ({
          kind: "progress",
          title: `${courseMap.get(item.course_id)?.title ?? "Curs"} • ${progressByLesson.has(item.lesson_id) ? "lecție urmărită" : "activitate nouă"}`,
          detail: `${item.completion_percent}% completat, ${Math.round(item.time_spent_seconds / 60)} min petrecute`,
          createdAt: item.last_activity_at ?? item.created_at,
        })),
      ...supportTickets.slice(0, 3).map((item) => ({
        kind: "support",
        title: `Ticket ${item.public_id} • ${item.status}`,
        detail: item.subject,
        createdAt: item.last_message_at,
      })),
    ]
      .filter((item) => Boolean(item.createdAt))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const profileCompletion = Math.round(
      [student.full_name, student.email, student.timezone, student.avatar_url, user?.id].filter(Boolean).length / 5 * 100,
    );

    const courseCompletion = courseCards.length > 0
      ? Math.round(courseCards.reduce((sum, item) => sum + item.progressPercent, 0) / courseCards.length)
      : 0;

    const recentActivityCount = activityFeed.length;
    const openSupportTickets = supportTickets.filter((item) => item.status === "open" || item.status === "in_progress").length;

    const recommendations: Array<{
      kind: string;
      title: string;
      description: string;
      reason: string;
    }> = [];

    if (!student.avatar_url) {
      recommendations.push({
        kind: "profile",
        title: "Adaugă avatarul contului",
        description: "Profilul tău nu are încă imagine. O completare vizuală ajută la identificare rapidă.",
        reason: "Lipsește avatarul",
      });
    }

    if (!student.timezone) {
      recommendations.push({
        kind: "profile",
        title: "Setează fusul orar",
        description: "Timezone-ul este gol. Îl folosim pentru program, activitate și notificări.",
        reason: "Lipsește timezone-ul",
      });
    }

    if (courseCards.length === 0) {
      const candidateCourses = courses.slice(0, 3);
      for (const course of candidateCourses) {
        const category = course.category_id ? categoryMap.get(course.category_id)?.name ?? "General" : "General";
        recommendations.push({
          kind: "course",
          title: `Începe cursul ${course.title}`,
          description: `${category} • ${formatLevel(course.level)} • ${course.estimated_mins ?? 0} min`,
          reason: "Nu ai cursuri active încă",
        });
      }
    } else {
      const weakestCourse = [...courseCards].sort((a, b) => a.progressPercent - b.progressPercent)[0];
      if (weakestCourse) {
        recommendations.push({
          kind: "course",
          title: `Continuă ${weakestCourse.title}`,
          description: weakestCourse.nextLessonTitle
            ? `Următoarea lecție: ${weakestCourse.nextLessonTitle}`
            : `Progres actual: ${weakestCourse.progressPercent}%`,
          reason: "Cel mai bun loc pentru următorul pas",
        });
      }
    }

    if (totalXp < 100) {
      recommendations.push({
        kind: "xp",
        title: "Câștigă XP prin activitate",
        description: "Finalizează lecții, quiz-uri sau exerciții pentru a-ți crește scorul.",
        reason: "XP total redus",
      });
    }

    if (recentActivityCount < 3) {
      recommendations.push({
        kind: "activity",
        title: "Începe o sesiune nouă",
        description: "Nu există suficientă activitate recentă pentru a personaliza complet feed-ul.",
        reason: "Puțină activitate recentă",
      });
    }

    if (openSupportTickets > 0) {
      recommendations.push({
        kind: "support",
        title: "Rezolvă tichetele deschise",
        description: `Ai ${openSupportTickets} tichete în stare deschisă sau în lucru.`,
        reason: "Există support deschis",
      });
    }

    const achievementsById = new Map(achievements.map((item) => [item.id, item]));
    const earnedBadges = userAchievements.slice(0, 6).map((item) => achievementsById.get(item.achievement_id)).filter(Boolean);

    return NextResponse.json({
      profile: {
        fullName: student.full_name,
        email: student.email,
        avatarUrl: student.avatar_url,
        timezone: student.timezone,
        status: student.status,
        completionPercent: profileCompletion,
        hasUserRecord: Boolean(user),
      },
      summary: {
        enrolledCourses: courseCards.length,
        activeCourses: courseCards.filter((item) => item.status === "ACTIVE").length,
        completedCourses: courseCards.filter((item) => item.progressPercent >= 100).length,
        totalLessons: courseCards.reduce((sum, item) => sum + item.totalLessons, 0),
        completedLessons: courseCards.reduce((sum, item) => sum + item.completedLessons, 0),
        totalXp,
        profileCompletion,
        courseCompletion,
        recentActivityCount,
        openSupportTickets,
      },
      courses: courseCards,
      xpChart,
      activityFeed,
      recommendations,
      achievements: earnedBadges.map((item) => ({
        id: item?.id ?? "",
        code: item?.code ?? "",
        name: item?.name ?? "",
        description: item?.description ?? "",
        xpReward: item?.xp_reward ?? 0,
      })),
      community: {
        friendsAvailable: false,
        friendsCount: null,
        note: "Nu există încă tabel de prieteni în schema curentă; zona este pregătită pentru integrare.",
        notificationsCount: notifications.length,
        supportTicketsCount: supportTickets.length,
      },
      schemaWarnings: [
        "friends table is not present in the current Supabase schema",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected student dashboard error." },
      { status: 500 },
    );
  }
}