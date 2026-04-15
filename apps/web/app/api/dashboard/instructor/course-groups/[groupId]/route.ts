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
  avatar_url: string | null;
  timezone: string | null;
  status: string;
};

type CourseGroupRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: "FOLDER" | "MODULE";
  cover_image_url: string | null;
  level_required: string | null;
  visibility: string;
  owner_instructor_account_id: string;
  coordinator_instructor_account_id: string | null;
  attachments: unknown;
  metadata: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type CourseRow = {
  id: string;
  group_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  category_id: string | null;
  visibility: string;
  created_by: string;
  estimated_mins: number | null;
  required_level: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type GroupMemberRow = {
  id: string;
  group_id: string;
  instructor_account_id: string;
  role: string;
};

type CourseGroupDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: "FOLDER" | "MODULE";
  coverImageUrl: string | null;
  levelRequired: string | null;
  visibility: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
  };
  coordinator: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
  } | null;
  attachments: unknown;
  metadata: unknown;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
  members: Array<{
    id: string;
    instructorId: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    timezone: string | null;
  }>;
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    level: string;
    visibility: string;
    estimatedMins: number | null;
    requiredLevel: string | null;
    createdBy: string;
    publishedAt: string | null;
    createdAt: string;
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

async function fetchJson<T>(supabaseUrl: string, path: string, init?: RequestInit) {
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

  return (await response.json()) as T;
}

async function fetchSingle<T>(supabaseUrl: string, path: string) {
  const rows = await fetchJson<T[]>(supabaseUrl, path);
  return rows[0] ?? null;
}

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toUpperCase();
}

async function getAuthedInstructor(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      ...getSupabaseHeaders(),
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    return null;
  }

  const authedUser = (await response.json()) as AuthUserResponse;
  if (normalizeRole(authedUser.user_metadata?.role) !== "INSTRUCTOR") {
    return null;
  }

  const email = (authedUser.email ?? "").trim().toLowerCase();
  const account =
    (await fetchSingle<InstructorAccountRow>(
      supabaseUrl,
      `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
    )) ??
    (email
      ? await fetchSingle<InstructorAccountRow>(
          supabaseUrl,
          `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status&email=eq.${encodeURIComponent(email)}&limit=1`,
        )
      : null);

  if (!account || account.status !== "ACTIVE") {
    return null;
  }

  return { supabaseUrl, account };
}

export async function GET(request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const auth = await getAuthedInstructor(request);
    if (!auth) {
      return NextResponse.json({ message: "Missing valid instructor session." }, { status: 401 });
    }

    const { groupId } = await context.params;

    const group = await fetchSingle<CourseGroupRow>(
      auth.supabaseUrl,
      `course_groups?select=id,slug,title,description,kind,cover_image_url,level_required,visibility,owner_instructor_account_id,coordinator_instructor_account_id,attachments,metadata,published_at,created_at,updated_at&id=eq.${encodeURIComponent(groupId)}&limit=1`,
    );

    if (!group) {
      return NextResponse.json({ message: "Group not found." }, { status: 404 });
    }

    const [owners, members, courses, instructors] = await Promise.all([
      fetchJson<InstructorAccountRow[]>(auth.supabaseUrl, `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status&id=eq.${encodeURIComponent(group.owner_instructor_account_id)}&limit=1`),
      fetchJson<GroupMemberRow[]>(auth.supabaseUrl, `course_group_members?select=id,group_id,instructor_account_id,role&group_id=eq.${encodeURIComponent(group.id)}&limit=100`),
      fetchJson<CourseRow[]>(auth.supabaseUrl, `courses?select=id,group_id,slug,title,description,level,language,category_id,visibility,created_by,estimated_mins,required_level,created_at,updated_at,published_at&group_id=eq.${encodeURIComponent(group.id)}&order=created_at.desc&limit=200`),
      fetchJson<InstructorAccountRow[]>(auth.supabaseUrl, "instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status&limit=500"),
    ]);

    const instructorMap = new Map(instructors.map((item) => [item.id, item]));
    const ownerRow = instructorMap.get(group.owner_instructor_account_id) ?? owners[0] ?? null;
    const coordinatorRow = group.coordinator_instructor_account_id ? instructorMap.get(group.coordinator_instructor_account_id) ?? null : null;

    const memberDetails = members
      .map((member) => {
        const instructor = instructorMap.get(member.instructor_account_id);
        if (!instructor) {
          return null;
        }

        return {
          id: member.id,
          instructorId: instructor.id,
          fullName: instructor.full_name,
          email: instructor.email,
          role: member.role,
          avatarUrl: instructor.avatar_url,
          timezone: instructor.timezone,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const detail: CourseGroupDetail = {
      id: group.id,
      slug: group.slug,
      title: group.title,
      description: group.description,
      kind: group.kind,
      coverImageUrl: group.cover_image_url,
      levelRequired: group.level_required,
      visibility: group.visibility,
      owner: {
        id: ownerRow?.id ?? group.owner_instructor_account_id,
        fullName: ownerRow?.full_name ?? "Profesor",
        email: ownerRow?.email ?? "-",
        avatarUrl: ownerRow?.avatar_url ?? null,
        timezone: ownerRow?.timezone ?? null,
      },
      coordinator: coordinatorRow
        ? {
            id: coordinatorRow.id,
            fullName: coordinatorRow.full_name,
            email: coordinatorRow.email,
            avatarUrl: coordinatorRow.avatar_url,
            timezone: coordinatorRow.timezone,
          }
        : null,
      attachments: group.attachments,
      metadata: group.metadata,
      publishedAt: group.published_at,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      memberCount: memberDetails.length,
      courseCount: courses.length,
      publishedCourseCount: courses.filter((course) => course.visibility === "PUBLISHED").length,
      draftCourseCount: courses.filter((course) => course.visibility === "DRAFT").length,
      members: memberDetails,
      courses: courses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        visibility: course.visibility,
        estimatedMins: course.estimated_mins,
        requiredLevel: course.required_level,
        createdBy: course.created_by,
        publishedAt: course.published_at,
        createdAt: course.created_at,
      })),
    };

    return NextResponse.json({ group: detail });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load group detail." },
      { status: 500 },
    );
  }
}
