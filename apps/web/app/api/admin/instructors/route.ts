import { NextResponse } from "next/server";
import { z } from "zod";

const createInstructorSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(320),
  password: z.string().min(8).max(72),
  phone: z.string().max(50).optional(),
  title: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  expertise: z.array(z.string().min(1).max(80)).max(20).optional().default([]),
  permissions: z
    .object({
      canManageCourses: z.boolean().optional().default(true),
      canManageContent: z.boolean().optional().default(false),
      canReviewSubmissions: z.boolean().optional().default(true),
      canManageStudents: z.boolean().optional().default(false),
      canViewSupport: z.boolean().optional().default(false),
      isSupervisor: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

type AppUser = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
};

type InstructorProfile = {
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

type InstructorActivity = {
  instructor_account_id: string;
  created_at: string;
  activity_type: string;
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const [usersResponse, profilesResponse, activityResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/instructor_accounts?select=id,auth_user_id,email,full_name,status,created_at&order=created_at.desc`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/instructor_profiles?select=*`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/instructor_activity_logs?select=instructor_account_id,created_at,activity_type&order=created_at.desc&limit=2000`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!usersResponse.ok || !profilesResponse.ok || !activityResponse.ok) {
      return NextResponse.json({ message: "Failed to load instructor data." }, { status: 502 });
    }

    const users = (await usersResponse.json()) as AppUser[];
    const profiles = (await profilesResponse.json()) as InstructorProfile[];
    const activity = (await activityResponse.json()) as InstructorActivity[];

    const profileByUserId = new Map(profiles.map((profile) => [profile.instructor_account_id, profile]));
    const activityByInstructor = new Map<string, InstructorActivity[]>();

    for (const row of activity) {
      const bucket = activityByInstructor.get(row.instructor_account_id) ?? [];
      bucket.push(row);
      activityByInstructor.set(row.instructor_account_id, bucket);
    }

    const items = users.map((user) => {
      const profile = profileByUserId.get(user.id);
      const logs = activityByInstructor.get(user.id) ?? [];

      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: "INSTRUCTOR",
        status: user.status,
        createdAt: user.created_at,
        profile: {
          phone: profile?.phone ?? null,
          title: profile?.title ?? null,
          bio: profile?.bio ?? null,
          expertise: profile?.expertise ?? [],
          permissions: {
            canManageCourses: profile?.can_manage_courses ?? false,
            canManageContent: profile?.can_manage_content ?? false,
            canReviewSubmissions: profile?.can_review_submissions ?? false,
            canManageStudents: profile?.can_manage_students ?? false,
            canViewSupport: profile?.can_view_support ?? false,
            isSupervisor: profile?.is_supervisor ?? false,
          },
        },
        activityCount: logs.length,
        lastActivityAt: logs[0]?.created_at ?? null,
        lastActivityType: logs[0]?.activity_type ?? null,
      };
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected instructors API error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = createInstructorSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const email = normalizeEmail(payload.email);

    const [existingStudentResponse, existingInstructorResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/student_accounts?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/instructor_accounts?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!existingStudentResponse.ok || !existingInstructorResponse.ok) {
      return NextResponse.json({ message: "Failed to validate existing account." }, { status: 502 });
    }

    const existingStudents = (await existingStudentResponse.json()) as Array<{ id: string; email: string }>;
    const existingInstructors = (await existingInstructorResponse.json()) as Array<{ id: string; email: string }>;
    if (existingStudents.length > 0 || existingInstructors.length > 0) {
      return NextResponse.json({ message: "Există deja un cont cu acest email." }, { status: 409 });
    }

    const authCreateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
          role: "INSTRUCTOR",
        },
      }),
    });

    if (!authCreateResponse.ok) {
      const errorText = await authCreateResponse.text();
      return NextResponse.json({ message: errorText }, { status: 502 });
    }

    const authUser = await authCreateResponse.json();
    const authUserId = (authUser?.id ?? authUser?.user?.id) as string | undefined;

    if (!authUserId) {
      return NextResponse.json({ message: "Invalid auth user payload." }, { status: 502 });
    }

    const appUserResponse = await fetch(`${supabaseUrl}/rest/v1/instructor_accounts`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        auth_user_id: authUserId,
        email,
        full_name: payload.fullName,
        status: "ACTIVE",
      }),
    });

    if (!appUserResponse.ok) {
      return NextResponse.json({ message: await appUserResponse.text() }, { status: 502 });
    }

    const insertedUsers = (await appUserResponse.json()) as Array<{ id: string }>;
    const appUserId = insertedUsers[0]?.id;

    if (!appUserId) {
      return NextResponse.json({ message: "Instructor profile creation failed." }, { status: 502 });
    }

    const permissions = payload.permissions ?? {};

    const instructorProfileResponse = await fetch(`${supabaseUrl}/rest/v1/instructor_profiles`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        instructor_account_id: appUserId,
        phone: payload.phone ?? null,
        title: payload.title ?? null,
        bio: payload.bio ?? null,
        expertise: payload.expertise ?? [],
        can_manage_courses: permissions.canManageCourses ?? true,
        can_manage_content: permissions.canManageContent ?? false,
        can_review_submissions: permissions.canReviewSubmissions ?? true,
        can_manage_students: permissions.canManageStudents ?? false,
        can_view_support: permissions.canViewSupport ?? false,
        is_supervisor: permissions.isSupervisor ?? false,
      }),
    });

    if (!instructorProfileResponse.ok) {
      return NextResponse.json({ message: await instructorProfileResponse.text() }, { status: 502 });
    }

    await fetch(`${supabaseUrl}/rest/v1/instructor_activity_logs`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        instructor_account_id: appUserId,
        actor_auth_user_id: null,
        activity_type: "ACCOUNT_CREATED",
        activity_payload: {
          createdVia: "admin_dashboard",
        },
      }),
    });

    return NextResponse.json({ ok: true, id: appUserId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected instructor creation error." },
      { status: 500 },
    );
  }
}