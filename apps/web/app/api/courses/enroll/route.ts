import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type StudentAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  status: string;
};

type AppUserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
};

type CourseRow = {
  id: string;
  visibility: string;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
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

async function insertRows<T>(supabaseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function upsertRows<T>(supabaseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function resolveStudentUser(supabaseUrl: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getStudentSessionCookieName())?.value;
  const session = verifyStudentSessionToken(token);

  if (!session || !session.email) {
    return null;
  }

  const studentById = await fetchRows<StudentAccountRow>(
    supabaseUrl,
    `student_accounts?select=id,auth_user_id,email,full_name,status&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
  );

  const studentByEmail = await fetchRows<StudentAccountRow>(
    supabaseUrl,
    `student_accounts?select=id,auth_user_id,email,full_name,status&email=eq.${encodeURIComponent(session.email.toLowerCase())}&limit=1`,
  );

  const student = studentById[0] ?? studentByEmail[0] ?? null;
  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const userByAuth = student.auth_user_id
    ? await fetchRows<AppUserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email&supabase_auth_id=eq.${encodeURIComponent(student.auth_user_id)}&limit=1`,
      )
    : [];

  const userByEmail = await fetchRows<AppUserRow>(
    supabaseUrl,
    `users?select=id,supabase_auth_id,email&email=eq.${encodeURIComponent(student.email.toLowerCase())}&limit=1`,
  );

  const existingUser = userByAuth[0] ?? userByEmail[0] ?? null;
  if (existingUser) {
    return existingUser;
  }

  const createdUsers = await upsertRows<AppUserRow>(
    supabaseUrl,
    "users?select=id,supabase_auth_id,email&on_conflict=email",
    {
      email: student.email.toLowerCase(),
      full_name: student.full_name ?? session.fullName,
      supabase_auth_id: student.auth_user_id,
      role: "STUDENT",
      status: "ACTIVE",
    },
  );

  return createdUsers[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { courseId?: string } | null;
    const courseId = body?.courseId?.trim();

    if (!courseId) {
      return NextResponse.json({ message: "Lipsește courseId." }, { status: 400 });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const studentUser = await resolveStudentUser(supabaseUrl);

    if (!studentUser) {
      return NextResponse.json({ message: "Trebuie să fii autentificat ca elev pentru enroll." }, { status: 401 });
    }

    const courseRows = await fetchRows<CourseRow>(
      supabaseUrl,
      `courses?select=id,visibility&id=eq.${encodeURIComponent(courseId)}&visibility=neq.DRAFT&limit=1`,
    );

    const course = courseRows[0] ?? null;
    if (!course) {
      return NextResponse.json({ message: "Cursul nu este disponibil pentru enroll." }, { status: 404 });
    }

    const existingRows = await fetchRows<EnrollmentRow>(
      supabaseUrl,
      `enrollments?select=id,user_id,course_id,status,enrolled_at&user_id=eq.${encodeURIComponent(studentUser.id)}&course_id=eq.${encodeURIComponent(courseId)}&limit=1`,
    );

    if (existingRows[0]) {
      return NextResponse.json({
        ok: true,
        alreadyEnrolled: true,
        enrollment: existingRows[0],
      });
    }

    const enrollmentRows = await insertRows<EnrollmentRow>(supabaseUrl, "enrollments", {
      user_id: studentUser.id,
      course_id: courseId,
      status: "ACTIVE",
    });

    const enrollment = enrollmentRows[0] ?? null;
    if (!enrollment) {
      return NextResponse.json({ message: "Nu am putut crea enroll-ul." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      alreadyEnrolled: false,
      enrollment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enroll in course.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
