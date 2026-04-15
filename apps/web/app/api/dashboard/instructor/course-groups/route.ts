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
  thumbnail_url: string | null;
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

type CourseGroupResponse = {
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
  };
  coordinator: {
    id: string;
    fullName: string;
    email: string;
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
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    level: string;
    visibility: string;
    estimatedMins: number | null;
    requiredLevel: string | null;
    publishedAt: string | null;
    createdAt: string;
  }>;
};

const createGroupSchema = {
  mode: "group" as const,
  title: "",
  slug: "",
  description: "",
  kind: "FOLDER" as const,
  visibility: "DRAFT",
  levelRequired: null as string | null,
  coverImageUrl: null as string | null,
  attachments: [] as Array<Record<string, unknown>>,
  metadata: {} as Record<string, unknown>,
};

type CreateGroupPayload = typeof createGroupSchema & {
  mode?: "group";
  coordinatorInstructorAccountId?: string | null;
};

type UpdateGroupPayload = {
  mode: "group";
  groupId: string;
  title: string;
  slug?: string;
  description?: string;
  kind?: "FOLDER" | "MODULE";
  visibility?: string;
  levelRequired?: string | null;
  coverImageUrl?: string | null;
  attachments?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

type CreateCoursePayload = {
  mode: "course";
  groupId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  level?: string;
  language?: string;
  categoryId?: string | null;
  visibility?: string;
  thumbnailUrl?: string | null;
  estimatedMins?: number | null;
  requiredLevel?: string | null;
  attachments?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  publishedAt?: string | null;
};

type CreatePayload = CreateGroupPayload | CreateCoursePayload;

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

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ensureStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  return input.filter((value): value is string => typeof value === "string");
}

type UserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
  full_name: string;
};

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

  // Ensure user exists in public users table for course creation
  let user = await fetchSingle<UserRow>(
    supabaseUrl,
    `users?select=id,supabase_auth_id,email,full_name&supabase_auth_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
  );

  if (!user && email) {
    // Try to find by email if not found by auth id
    user = await fetchSingle<UserRow>(
      supabaseUrl,
      `users?select=id,supabase_auth_id,email,full_name&email=eq.${encodeURIComponent(email)}&limit=1`,
    );

    // If found but auth_id is null, update it
    if (user && !user.supabase_auth_id) {
      try {
        const updatedUsers = await fetchJson<UserRow[]>(
          supabaseUrl,
          `users?id=eq.${encodeURIComponent(user.id)}`,
          {
            method: "PATCH",
            headers: {
              ...getSupabaseHeaders(),
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              supabase_auth_id: authedUser.id,
            }),
          },
        );
        user = updatedUsers[0] ?? user;
      } catch {
        // If update fails, continue with existing user
      }
    }
  }

  if (!user) {
    // Create user record if doesn't exist
    try {
      const userRows = await fetchJson<UserRow[]>(supabaseUrl, "users", {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          supabase_auth_id: authedUser.id,
          email: authedUser.email,
          full_name: account.full_name,
          role: "INSTRUCTOR",
          status: "ACTIVE",
        }),
      });
      user = userRows[0] ?? null;
    } catch (error) {
      // If creation fails (e.g., duplicate), try to fetch again
      user = await fetchSingle<UserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email,full_name&email=eq.${encodeURIComponent(email)}&limit=1`,
      );
    }
  }

  if (!user) {
    return null;
  }

  return { supabaseUrl, authedUser, account, user };
}

async function loadAccessibleGroups(supabaseUrl: string, accountId: string) {
  const [groups, groupMembers, courses, instructors] = await Promise.all([
    fetchJson<CourseGroupRow[]>(
      supabaseUrl,
      `course_groups?select=id,slug,title,description,kind,cover_image_url,level_required,visibility,owner_instructor_account_id,coordinator_instructor_account_id,attachments,metadata,published_at,created_at,updated_at&or=(owner_instructor_account_id.eq.${encodeURIComponent(accountId)},coordinator_instructor_account_id.eq.${encodeURIComponent(accountId)})&order=created_at.desc`,
    ),
    fetchJson<GroupMemberRow[]>(
      supabaseUrl,
      `course_group_members?select=id,group_id,instructor_account_id,role&limit=1000`,
    ),
    fetchJson<CourseRow[]>(
      supabaseUrl,
      `courses?select=id,group_id,slug,title,description,level,language,category_id,visibility,created_by,estimated_mins,required_level,created_at,updated_at,published_at&order=created_at.desc&limit=2000`,
    ),
    fetchJson<InstructorAccountRow[]>(
      supabaseUrl,
      `instructor_accounts?select=id,auth_user_id,email,full_name,avatar_url,timezone,status&limit=500`,
    ),
  ]);

  const instructorMap = new Map(instructors.map((instructor) => [instructor.id, instructor]));
  const membersByGroup = new Map<string, GroupMemberRow[]>();
  for (const member of groupMembers) {
    const bucket = membersByGroup.get(member.group_id) ?? [];
    bucket.push(member);
    membersByGroup.set(member.group_id, bucket);
  }

  const coursesByGroup = new Map<string, CourseRow[]>();
  for (const course of courses) {
    if (!course.group_id) {
      continue;
    }

    const bucket = coursesByGroup.get(course.group_id) ?? [];
    bucket.push(course);
    coursesByGroup.set(course.group_id, bucket);
  }

  return groups.map((group) => {
    const groupCourses = coursesByGroup.get(group.id) ?? [];
    const owner = instructorMap.get(group.owner_instructor_account_id);
    const coordinator = group.coordinator_instructor_account_id ? instructorMap.get(group.coordinator_instructor_account_id) ?? null : null;
    const members = membersByGroup.get(group.id) ?? [];

    return {
      id: group.id,
      slug: group.slug,
      title: group.title,
      description: group.description,
      kind: group.kind,
      coverImageUrl: group.cover_image_url,
      levelRequired: group.level_required,
      visibility: group.visibility,
      owner: {
        id: owner?.id ?? group.owner_instructor_account_id,
        fullName: owner?.full_name ?? "Profesor",
        email: owner?.email ?? "-",
      },
      coordinator: coordinator
        ? {
            id: coordinator.id,
            fullName: coordinator.full_name,
            email: coordinator.email,
          }
        : null,
      attachments: group.attachments,
      metadata: group.metadata,
      publishedAt: group.published_at,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      memberCount: members.length,
      courseCount: groupCourses.length,
      publishedCourseCount: groupCourses.filter((course) => course.visibility === "PUBLISHED").length,
      draftCourseCount: groupCourses.filter((course) => course.visibility === "DRAFT").length,
      courses: groupCourses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        visibility: course.visibility,
        estimatedMins: course.estimated_mins,
        requiredLevel: course.required_level,
        publishedAt: course.published_at,
        createdAt: course.created_at,
      })),
    } satisfies CourseGroupResponse;
  });
}

export async function GET(request: Request) {
  try {
    const context = await getAuthedInstructor(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid instructor session." }, { status: 401 });
    }

    const groups = await loadAccessibleGroups(context.supabaseUrl, context.account.id);
    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load course groups." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthedInstructor(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid instructor session." }, { status: 401 });
    }

    const payload = (await request.json()) as CreatePayload;

    if (payload.mode === "course") {
      // If groupId is provided, verify access
      if (payload.groupId) {
        const group = await fetchSingle<CourseGroupRow>(
          context.supabaseUrl,
          `course_groups?select=id,owner_instructor_account_id,coordinator_instructor_account_id&id=eq.${encodeURIComponent(payload.groupId)}&limit=1`,
        );

        if (!group) {
          return NextResponse.json({ message: "Folderul/modulul nu există." }, { status: 404 });
        }

        const isOwner = group.owner_instructor_account_id === context.account.id;
        const isCoordinator = group.coordinator_instructor_account_id === context.account.id;
        if (!isOwner && !isCoordinator) {
          return NextResponse.json({ message: "Nu ai acces să creezi cursuri în acest grup." }, { status: 403 });
        }
      }

      const courseSlug = payload.slug ? toSlug(payload.slug) : toSlug(payload.title);
      const courseRows = await fetchJson<CourseRow[]>(context.supabaseUrl, "courses", {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          group_id: payload.groupId ?? null,
          slug: courseSlug,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          level: payload.level ?? "BEGINNER",
          language: payload.language ?? "ro",
          category_id: payload.categoryId ?? null,
          visibility: payload.visibility ?? "DRAFT",
          thumbnail_url: payload.thumbnailUrl ?? null,
          created_by: context.user.id,
          estimated_mins: payload.estimatedMins ?? null,
          required_level: payload.requiredLevel ?? null,
          attachments: payload.attachments ?? [],
          metadata: payload.metadata ?? {},
          published_at: (payload.visibility ?? "DRAFT") === "PUBLISHED"
            ? payload.publishedAt ?? new Date().toISOString()
            : null,
        }),
      });

      const createdCourse = courseRows[0] ?? null;
      if (!createdCourse) {
        return NextResponse.json({ message: "Nu am putut crea cursul." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, mode: "course", course: createdCourse }, { status: 201 });
    }

    const groupPayload = payload as CreateGroupPayload;
    const slug = toSlug(groupPayload.slug || groupPayload.title);
    const coordinatorId = groupPayload.coordinatorInstructorAccountId ?? context.account.id;

    const [coordinator] = await Promise.all([
      fetchSingle<InstructorAccountRow>(
        context.supabaseUrl,
        `instructor_accounts?select=id,status&id=eq.${encodeURIComponent(coordinatorId)}&limit=1`,
      ),
    ]);

    if (!coordinator || coordinator.status !== "ACTIVE") {
      return NextResponse.json({ message: "Coordinatorul selectat nu există sau nu este activ." }, { status: 400 });
    }

    const groupRows = await fetchJson<CourseGroupRow[]>(context.supabaseUrl, "course_groups", {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        slug,
        title: groupPayload.title.trim(),
        description: groupPayload.description?.trim() || null,
        kind: groupPayload.kind ?? "FOLDER",
        cover_image_url: groupPayload.coverImageUrl ?? null,
        level_required: groupPayload.levelRequired ?? null,
        visibility: groupPayload.visibility ?? "DRAFT",
        owner_instructor_account_id: context.account.id,
        coordinator_instructor_account_id: coordinatorId,
        attachments: groupPayload.attachments ?? [],
        metadata: groupPayload.metadata ?? {},
        published_at: groupPayload.visibility === "PUBLISHED" ? new Date().toISOString() : null,
      }),
    });

    const group = groupRows[0] ?? null;
    if (!group) {
      return NextResponse.json({ message: "Nu am putut crea folderul/modulul." }, { status: 500 });
    }

    await fetch(`${context.supabaseUrl}/rest/v1/course_group_members`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        group_id: group.id,
        instructor_account_id: coordinatorId,
        role: "COORDINATOR",
      }),
    });

    return NextResponse.json({ ok: true, mode: "group", group }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save course system data." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthedInstructor(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid instructor session." }, { status: 401 });
    }

    const payload = (await request.json()) as UpdateGroupPayload;
    if (!payload.groupId) {
      return NextResponse.json({ message: "Lipsește grupul de actualizat." }, { status: 400 });
    }

    const group = await fetchSingle<CourseGroupRow>(
      context.supabaseUrl,
      `course_groups?select=id,slug,title,description,kind,cover_image_url,level_required,visibility,owner_instructor_account_id,coordinator_instructor_account_id,attachments,metadata,published_at,created_at,updated_at&id=eq.${encodeURIComponent(payload.groupId)}&limit=1`,
    );

    if (!group) {
      return NextResponse.json({ message: "Grupul nu există." }, { status: 404 });
    }

    const isOwner = group.owner_instructor_account_id === context.account.id;
    const isCoordinator = group.coordinator_instructor_account_id === context.account.id;
    if (!isOwner && !isCoordinator) {
      return NextResponse.json({ message: "Nu ai acces să modifici acest grup." }, { status: 403 });
    }

    const slug = toSlug(payload.slug || payload.title);
    const groupRows = await fetchJson<CourseGroupRow[]>(context.supabaseUrl, `course_groups?id=eq.${encodeURIComponent(payload.groupId)}`, {
      method: "PATCH",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        slug,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        kind: payload.kind ?? group.kind,
        cover_image_url: payload.coverImageUrl ?? group.cover_image_url,
        level_required: payload.levelRequired ?? group.level_required,
        visibility: payload.visibility ?? group.visibility,
        attachments: payload.attachments ?? group.attachments,
        metadata: payload.metadata ?? group.metadata,
        published_at: (payload.visibility ?? group.visibility) === "PUBLISHED" ? group.published_at ?? new Date().toISOString() : null,
      }),
    });

    const updatedGroup = groupRows[0] ?? null;
    if (!updatedGroup) {
      return NextResponse.json({ message: "Nu am putut salva grupul." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: "group", group: updatedGroup });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update course group." },
      { status: 500 },
    );
  }
}
