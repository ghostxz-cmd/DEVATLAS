import { NextResponse } from "next/server";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
    full_name?: string;
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
  title: string;
  created_by: string;
  created_at: string;
};

type InstructorActivityRow = {
  id: string;
  instructor_account_id: string;
  activity_type: string;
  activity_payload: Record<string, unknown> | null;
  created_at: string;
};

type NetworkColleague = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
  status: string;
  title: string | null;
  expertise: string[];
  courseCount: number;
  activityCount: number;
  lastActivityAt: string | null;
  lastActivityType: string | null;
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

async function fetchSingleRow<T>(supabaseUrl: string, path: string) {
  const rows = await fetchRows<T>(supabaseUrl, path);
  return rows[0] ?? null;
}

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toUpperCase();
}

function matchesNeedle(value: string | null | undefined, needle: string) {
  return (value ?? "").toLowerCase().includes(needle);
}

function getActivityLabel(activityType: string) {
  return activityType
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const authorization = request.headers.get("authorization");
    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

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

    const [instructors, profiles, activities, courses] = await Promise.all([
      fetchRows<InstructorAccountRow>(supabaseUrl, "instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status,created_at&order=created_at.desc&limit=200"),
      fetchRows<InstructorProfileRow>(supabaseUrl, "instructor_profiles?select=instructor_account_id,phone,title,bio,expertise,can_manage_courses,can_manage_content,can_review_submissions,can_manage_students,can_view_support,is_supervisor&limit=200"),
      fetchRows<InstructorActivityRow>(supabaseUrl, "instructor_activity_logs?select=id,instructor_account_id,activity_type,activity_payload,created_at&order=created_at.desc&limit=500"),
      fetchRows<CourseRow>(supabaseUrl, "courses?select=id,title,created_by,created_at&order=created_at.desc&limit=400"),
    ]);

    const profileMap = new Map(profiles.map((profile) => [profile.instructor_account_id, profile]));
    const courseCountMap = new Map<string, number>();
    for (const course of courses) {
      courseCountMap.set(course.created_by, (courseCountMap.get(course.created_by) ?? 0) + 1);
    }

    const activityByInstructor = new Map<string, InstructorActivityRow[]>();
    for (const activity of activities) {
      const bucket = activityByInstructor.get(activity.instructor_account_id) ?? [];
      bucket.push(activity);
      activityByInstructor.set(activity.instructor_account_id, bucket);
    }

    const colleagues = instructors
      .filter((instructor) => instructor.id !== account.id)
      .map((instructor) => {
        const profile = profileMap.get(instructor.id) ?? null;
        const instructorActivities = activityByInstructor.get(instructor.id) ?? [];
        const latestActivity = instructorActivities[0] ?? null;

        return {
          id: instructor.id,
          fullName: instructor.full_name,
          email: instructor.email,
          avatarUrl: instructor.avatar_url,
          timezone: instructor.timezone,
          status: instructor.status,
          title: profile?.title ?? null,
          expertise: profile?.expertise ?? [],
          courseCount: courseCountMap.get(instructor.id) ?? 0,
          activityCount: instructorActivities.length,
          lastActivityAt: latestActivity?.created_at ?? null,
          lastActivityType: latestActivity?.activity_type ?? null,
        } satisfies NetworkColleague;
      })
      .filter((item) => {
        if (!query) {
          return true;
        }

        return [
          item.fullName,
          item.email,
          item.title,
          item.status,
          item.lastActivityType,
          ...item.expertise,
        ].some((value) => matchesNeedle(value, query));
      })
      .sort((a, b) => {
        const aScore = new Date(a.lastActivityAt ?? 0).getTime();
        const bScore = new Date(b.lastActivityAt ?? 0).getTime();
        return bScore - aScore;
      });

    const activityFeed = activities
      .slice(0, 12)
      .map((activity) => {
        const relatedInstructor = instructors.find((item) => item.id === activity.instructor_account_id);
        return {
          id: activity.id,
          title: `${relatedInstructor?.full_name ?? "Profesor"} • ${getActivityLabel(activity.activity_type)}`,
          detail: activity.activity_payload ? JSON.stringify(activity.activity_payload).slice(0, 120) : "Activitate înregistrată în sistem.",
          createdAt: activity.created_at,
        };
      });

    const activeColleagues = colleagues.filter((colleague) => colleague.status === "ACTIVE").length;
    const totalCourses = colleagues.reduce((sum, colleague) => sum + colleague.courseCount, 0);

    return NextResponse.json({
      profile: {
        id: account.id,
        fullName: account.full_name,
        email: account.email,
        avatarUrl: account.avatar_url,
        timezone: account.timezone,
      },
      summary: {
        totalColleagues: colleagues.length,
        activeColleagues,
        totalCourses,
        totalActivity: activities.length,
      },
      colleagues,
      activityFeed,
      query,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected instructor network error." },
      { status: 500 },
    );
  }
}