import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
    full_name?: string;
  };
};

type AppUserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
  full_name: string;
  role: string;
};

type CourseRow = {
  id: string;
  title: string;
  created_by: string;
  visibility: string;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  status: string;
};

type StudentAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  status: string;
};

type ChatRow = {
  id: string;
  course_id: string;
};

type ChatMessageRow = {
  id: string;
  chat_id: string;
  course_id: string;
  sender_user_id: string | null;
  sender_name: string;
  sender_role: "profesor" | "elev" | "asistent" | "sistem";
  channel: "general" | "announcements" | "qa" | "students-only";
  message: string;
  is_pinned: boolean;
  reactions: { like?: number; fire?: number } | null;
  created_at: string;
};

type Viewer = {
  userId: string;
  name: string;
  email: string;
  role: "profesor" | "elev" | "admin";
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

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toUpperCase();
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

async function insertRows<T>(supabaseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function patchRows<T>(supabaseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function resolveViewer(request: Request, supabaseUrl: string): Promise<Viewer | null> {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        ...getSupabaseHeaders(),
        Authorization: authorization,
      },
      cache: "no-store",
    });

    if (authResponse.ok) {
      const authUser = (await authResponse.json()) as AuthUserResponse;
      const role = normalizeRole(authUser.user_metadata?.role);
      const email = (authUser.email ?? "").trim().toLowerCase();

      const appUser =
        (await fetchSingleRow<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name,role&supabase_auth_id=eq.${encodeURIComponent(authUser.id)}&limit=1`,
        )) ??
        (email
          ? await fetchSingleRow<AppUserRow>(
              supabaseUrl,
              `users?select=id,supabase_auth_id,email,full_name,role&email=eq.${encodeURIComponent(email)}&limit=1`,
            )
          : null);

      if (appUser && (role === "INSTRUCTOR" || role === "ADMIN")) {
        return {
          userId: appUser.id,
          name: appUser.full_name || authUser.user_metadata?.full_name || "Profesor",
          email: appUser.email,
          role: role === "ADMIN" ? "admin" : "profesor",
        };
      }
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getStudentSessionCookieName())?.value;
  const session = verifyStudentSessionToken(token);
  if (!session) {
    return null;
  }

  const student =
    (await fetchSingleRow<StudentAccountRow>(
      supabaseUrl,
      `student_accounts?select=id,auth_user_id,email,full_name,status&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
    )) ??
    (await fetchSingleRow<StudentAccountRow>(
      supabaseUrl,
      `student_accounts?select=id,auth_user_id,email,full_name,status&email=eq.${encodeURIComponent(session.email.toLowerCase())}&limit=1`,
    ));

  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const appUser =
    (student.auth_user_id
      ? await fetchSingleRow<AppUserRow>(
          supabaseUrl,
          `users?select=id,supabase_auth_id,email,full_name,role&supabase_auth_id=eq.${encodeURIComponent(student.auth_user_id)}&limit=1`,
        )
      : null) ??
    (await fetchSingleRow<AppUserRow>(
      supabaseUrl,
      `users?select=id,supabase_auth_id,email,full_name,role&email=eq.${encodeURIComponent(student.email.toLowerCase())}&limit=1`,
    ));

  if (!appUser) {
    return null;
  }

  return {
    userId: appUser.id,
    name: appUser.full_name || student.full_name || session.fullName,
    email: appUser.email,
    role: "elev",
  };
}

async function ensureChat(supabaseUrl: string, courseId: string) {
  const upserted = await upsertRows<ChatRow>(
    supabaseUrl,
    "course_group_chats?select=id,course_id&on_conflict=course_id",
    {
      course_id: courseId,
      title: null,
    },
  );

  return upserted[0] ?? null;
}

async function verifyCourseAccess(supabaseUrl: string, courseId: string, viewer: Viewer) {
  const course = await fetchSingleRow<CourseRow>(
    supabaseUrl,
    `courses?select=id,title,created_by,visibility&id=eq.${encodeURIComponent(courseId)}&limit=1`,
  );

  if (!course) {
    return { ok: false as const, status: 404, message: "Cursul nu exista." };
  }

  if (viewer.role === "admin") {
    return { ok: true as const, course };
  }

  if (viewer.role === "profesor") {
    if (course.created_by !== viewer.userId) {
      return { ok: false as const, status: 403, message: "Nu ai acces la chat-ul acestui curs." };
    }
    return { ok: true as const, course };
  }

  const enrollment = await fetchSingleRow<EnrollmentRow>(
    supabaseUrl,
    `enrollments?select=id,user_id,status&course_id=eq.${encodeURIComponent(courseId)}&user_id=eq.${encodeURIComponent(viewer.userId)}&limit=1`,
  );

  if (!enrollment) {
    return { ok: false as const, status: 403, message: "Nu esti inscris la acest curs." };
  }

  return { ok: true as const, course };
}

async function getParticipants(supabaseUrl: string, courseId: string, courseOwnerUserId: string, viewer: Viewer) {
  const owner = await fetchSingleRow<AppUserRow>(
    supabaseUrl,
    `users?select=id,supabase_auth_id,email,full_name,role&id=eq.${encodeURIComponent(courseOwnerUserId)}&limit=1`,
  );

  const enrollments = await fetchRows<EnrollmentRow>(
    supabaseUrl,
    `enrollments?select=id,user_id,status&course_id=eq.${encodeURIComponent(courseId)}&limit=200`,
  );

  const studentIds = Array.from(new Set(enrollments.map((item) => item.user_id)));
  const students = studentIds.length
    ? await fetchRows<AppUserRow>(
        supabaseUrl,
        `users?select=id,supabase_auth_id,email,full_name,role&id=in.(${studentIds.map((id) => encodeURIComponent(id)).join(",")})&limit=200`,
      )
    : [];

  const byId = new Map(students.map((item) => [item.id, item]));
  const participants = [
    owner
      ? {
          id: owner.id,
          name: owner.full_name || "Profesor",
          detail: "profesor",
          status: "online",
        }
      : null,
    ...enrollments.map((enrollment) => {
      const user = byId.get(enrollment.user_id);
      return {
        id: enrollment.user_id,
        name: user?.full_name || user?.email || "Elev",
        detail: enrollment.status.toLowerCase(),
        status: enrollment.user_id === viewer.userId ? "online" : enrollment.status === "ACTIVE" ? "away" : "offline",
      };
    }),
  ].filter(Boolean) as Array<{ id: string; name: string; detail: string; status: "online" | "away" | "offline" }>;

  return participants.slice(0, 50);
}

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const viewer = await resolveViewer(request, supabaseUrl);
    if (!viewer) {
      return NextResponse.json({ message: "Sesiune invalida." }, { status: 401 });
    }

    const access = await verifyCourseAccess(supabaseUrl, courseId, viewer);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const chat = await ensureChat(supabaseUrl, courseId);
    if (!chat) {
      return NextResponse.json({ message: "Nu am putut initializa chat-ul." }, { status: 500 });
    }

    const messages = await fetchRows<ChatMessageRow>(
      supabaseUrl,
      `course_group_chat_messages?select=id,chat_id,course_id,sender_user_id,sender_name,sender_role,channel,message,is_pinned,reactions,created_at&chat_id=eq.${encodeURIComponent(chat.id)}&order=created_at.asc&limit=500`,
    );

    const participants = await getParticipants(supabaseUrl, courseId, access.course.created_by, viewer);

    return NextResponse.json({
      viewer,
      course: {
        id: access.course.id,
        title: access.course.title,
      },
      participants,
      messages: messages.map((item) => ({
        id: item.id,
        channel: item.channel,
        authorName: item.sender_name,
        authorRole: item.sender_role,
        text: item.message,
        pinned: item.is_pinned,
        reactions: {
          like: Number(item.reactions?.like ?? 0),
          fire: Number(item.reactions?.fire ?? 0),
        },
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load group chat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      text?: string;
      channel?: "general" | "announcements" | "qa" | "students-only";
    } | null;

    const text = body?.text?.trim();
    const channel = body?.channel ?? "general";

    if (!text) {
      return NextResponse.json({ message: "Mesajul nu poate fi gol." }, { status: 400 });
    }

    if (!["general", "announcements", "qa", "students-only"].includes(channel)) {
      return NextResponse.json({ message: "Canal invalid." }, { status: 400 });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const viewer = await resolveViewer(request, supabaseUrl);
    if (!viewer) {
      return NextResponse.json({ message: "Sesiune invalida." }, { status: 401 });
    }

    const access = await verifyCourseAccess(supabaseUrl, courseId, viewer);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    if (channel === "announcements" && viewer.role === "elev") {
      return NextResponse.json(
        { message: "Elevii nu pot scrie pe canalul de anunțuri." },
        { status: 403 },
      );
    }

    if (channel === "students-only" && viewer.role !== "elev") {
      return NextResponse.json(
        { message: "Doar elevii pot scrie pe canalul privat de elevi." },
        { status: 403 },
      );
    }

    const chat = await ensureChat(supabaseUrl, courseId);
    if (!chat) {
      return NextResponse.json({ message: "Nu am putut initializa chat-ul." }, { status: 500 });
    }

    const inserted = await insertRows<ChatMessageRow>(
      supabaseUrl,
      "course_group_chat_messages?select=id,chat_id,course_id,sender_user_id,sender_name,sender_role,channel,message,is_pinned,reactions,created_at",
      {
        chat_id: chat.id,
        course_id: courseId,
        sender_user_id: viewer.userId,
        sender_name: viewer.name,
        sender_role: viewer.role === "elev" ? "elev" : "profesor",
        channel,
        message: text,
      },
    );

    const message = inserted[0];

    return NextResponse.json({
      message: {
        id: message.id,
        channel: message.channel,
        authorName: message.sender_name,
        authorRole: message.sender_role,
        text: message.message,
        pinned: message.is_pinned,
        reactions: {
          like: Number(message.reactions?.like ?? 0),
          fire: Number(message.reactions?.fire ?? 0),
        },
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send message." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      messageId?: string;
      action?: "toggle_pin";
    } | null;

    if (!body?.messageId || body.action !== "toggle_pin") {
      return NextResponse.json({ message: "Payload invalid." }, { status: 400 });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const viewer = await resolveViewer(request, supabaseUrl);
    if (!viewer) {
      return NextResponse.json({ message: "Sesiune invalida." }, { status: 401 });
    }

    if (viewer.role === "elev") {
      return NextResponse.json({ message: "Doar profesorul poate pin-ui mesaje." }, { status: 403 });
    }

    const access = await verifyCourseAccess(supabaseUrl, courseId, viewer);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const existing = await fetchSingleRow<ChatMessageRow>(
      supabaseUrl,
      `course_group_chat_messages?select=id,chat_id,course_id,sender_user_id,sender_name,sender_role,channel,message,is_pinned,reactions,created_at&id=eq.${encodeURIComponent(body.messageId)}&course_id=eq.${encodeURIComponent(courseId)}&limit=1`,
    );

    if (!existing) {
      return NextResponse.json({ message: "Mesajul nu exista." }, { status: 404 });
    }

    const updatedRows = await patchRows<ChatMessageRow>(
      supabaseUrl,
      `course_group_chat_messages?select=id,chat_id,course_id,sender_user_id,sender_name,sender_role,channel,message,is_pinned,reactions,created_at&id=eq.${encodeURIComponent(body.messageId)}&course_id=eq.${encodeURIComponent(courseId)}`,
      { is_pinned: !existing.is_pinned },
    );

    const message = updatedRows[0];
    return NextResponse.json({
      message: {
        id: message.id,
        channel: message.channel,
        authorName: message.sender_name,
        authorRole: message.sender_role,
        text: message.message,
        pinned: message.is_pinned,
        reactions: {
          like: Number(message.reactions?.like ?? 0),
          fire: Number(message.reactions?.fire ?? 0),
        },
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update message." },
      { status: 500 },
    );
  }
}
