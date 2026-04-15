import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  category_id: string | null;
  visibility: string;
  thumbnail_url: string | null;
  created_by: string;
  estimated_mins: number | null;
  created_at: string;
};

type CourseCategoryRow = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  full_name: string;
};

type StudentAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  status: string;
};

type AppUserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
};

type EnrollmentRow = {
  user_id: string;
  course_id: string;
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

function formatLevel(level: string) {
  return level.toLowerCase().replaceAll("_", " ");
}

async function resolveStudentUserId(supabaseUrl: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getStudentSessionCookieName())?.value;
  const session = verifyStudentSessionToken(token);

  if (!session) {
    return null;
  }

  const studentRows = await fetchRows<StudentAccountRow>(
    supabaseUrl,
    `student_accounts?select=id,auth_user_id,email,status&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
  );

  const student = studentRows[0] ?? null;
  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const userByAuth = student.auth_user_id
    ? await fetchRows<AppUserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email&supabase_auth_id=eq.${encodeURIComponent(student.auth_user_id)}&limit=1`,
      )
    : [];

  const userByEmail = userByAuth.length > 0
    ? []
    : await fetchRows<AppUserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email&email=eq.${encodeURIComponent(student.email.toLowerCase())}&limit=1`,
      );

  return (userByAuth[0] ?? userByEmail[0] ?? null)?.id ?? null;
}

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const [courses, categories, studentUserId] = await Promise.all([
      fetchRows<CourseRow>(
        supabaseUrl,
        "courses?select=id,slug,title,description,level,language,category_id,visibility,thumbnail_url,created_by,estimated_mins,created_at&visibility=neq.DRAFT&order=created_at.desc&limit=300",
      ),
      fetchRows<CourseCategoryRow>(supabaseUrl, "course_categories?select=id,name&order=name.asc&limit=100"),
      resolveStudentUserId(supabaseUrl),
    ]);

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const creatorIds = Array.from(new Set(courses.map((course) => course.created_by).filter(Boolean)));

    const creators = creatorIds.length > 0
      ? await fetchRows<UserRow>(
          supabaseUrl,
          `users?select=id,full_name&id=in.(${creatorIds.map((id) => encodeURIComponent(id)).join(",")})&limit=500`,
        )
      : [];

    const creatorMap = new Map(creators.map((creator) => [creator.id, creator.full_name]));

    const enrollments = studentUserId
      ? await fetchRows<EnrollmentRow>(
          supabaseUrl,
          `enrollments?select=user_id,course_id&user_id=eq.${encodeURIComponent(studentUserId)}&limit=1000`,
        )
      : [];

    const enrolledSet = new Set(enrollments.map((item) => item.course_id));

    return NextResponse.json({
      courses: courses.map((course) => ({
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: formatLevel(course.level),
        language: course.language,
        category: course.category_id ? categoryMap.get(course.category_id)?.name ?? null : null,
        thumbnailUrl: course.thumbnail_url,
        estimatedMins: course.estimated_mins,
        createdAt: course.created_at,
        instructorName: creatorMap.get(course.created_by) ?? "Instructor",
        isEnrolled: enrolledSet.has(course.id),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load public courses." },
      { status: 500 },
    );
  }
}
