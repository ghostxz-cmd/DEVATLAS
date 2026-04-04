import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    full_name?: string;
    role?: string;
    avatar_url?: string;
    timezone?: string;
  };
};

type AccountProfile = {
  full_name: string;
  email: string;
  avatar_url: string | null;
  timezone: string | null;
};

type StoredPreferences = Record<string, unknown>;

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  status: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const preferenceDefaults = {
  theme: "dark",
  language: "ro",
  accentColor: "cyan",
  density: "comfortable",
  reducedMotion: false,
  highContrast: false,
  emailNotifications: true,
  weeklyDigest: true,
  securityAlerts: true,
  productUpdates: false,
  profileVisibility: "private",
  learningMode: "balanced",
  autoSave: true,
  compactNavigation: false,
  showHints: true,
  sessionTimeoutMinutes: 60,
  dashboardCards: "all",
  smartSummaries: true,
  focusMode: false,
} as const;

const settingsSchema = z.object({
  fullName: z.string().min(2).max(120),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().min(2).max(80).nullable().optional(),
  preferences: z.object({
    theme: z.enum(["dark", "light"]),
    language: z.enum(["ro", "en"]),
    accentColor: z.enum(["cyan", "emerald", "amber", "rose", "violet"]),
    density: z.enum(["comfortable", "compact", "spacious"]),
    reducedMotion: z.boolean(),
    highContrast: z.boolean(),
    emailNotifications: z.boolean(),
    weeklyDigest: z.boolean(),
    securityAlerts: z.boolean(),
    productUpdates: z.boolean(),
    profileVisibility: z.enum(["private", "public"]),
    learningMode: z.enum(["balanced", "focused", "accelerated"]),
    autoSave: z.boolean(),
    compactNavigation: z.boolean(),
    showHints: z.boolean(),
    sessionTimeoutMinutes: z.number().int().min(5).max(240),
    dashboardCards: z.enum(["all", "compact"]),
    smartSummaries: z.boolean(),
    focusMode: z.boolean(),
  }),
});

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
  return (role ?? "STUDENT").trim().toUpperCase();
}

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function mergePreferences(stored: StoredPreferences | null | undefined) {
  return {
    ...preferenceDefaults,
    ...(stored ?? {}),
  };
}

async function getAuthedUser(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing authorization header.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      ...getSupabaseHeaders(),
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as AuthUserResponse;
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rest.join("="));
  }

  return null;
}

async function getStudentFromCookieSession(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const token = getCookieValue(request, getStudentSessionCookieName());
  const session = verifyStudentSessionToken(token);

  if (!session) {
    return null;
  }

  const student = await fetchSingleRow<StudentAccountRow>(
    `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,avatar_url,timezone,status&id=eq.${encodeURIComponent(session.studentId)}&limit=1`,
  );

  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  return student;
}

async function fetchSingleRow<T>(url: string) {
  const response = await fetch(url, { headers: getSupabaseHeaders() });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
}

async function upsertJsonRow(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function patchRows(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const authorization = request.headers.get("authorization");

    if (authorization?.startsWith("Bearer ")) {
      const authedUser = await getAuthedUser(request);
      const role = normalizeRole(authedUser.user_metadata?.role);
      const email = normalizeEmail(authedUser.email);

      const preferencesRow = await fetchSingleRow<{
        full_name: string | null;
        avatar_url: string | null;
        timezone: string | null;
        preferences: StoredPreferences | null;
      }>(
        `${supabaseUrl}/rest/v1/account_preferences?select=full_name,avatar_url,timezone,preferences&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
      );

      let profile: AccountProfile = {
        full_name: authedUser.user_metadata?.full_name ?? (email || "Cont DevAtlas"),
        email,
        avatar_url: authedUser.user_metadata?.avatar_url ?? null,
        timezone: authedUser.user_metadata?.timezone ?? null,
      };

      if (role === "STUDENT") {
        const studentRow = await fetchSingleRow<AccountProfile>(
          `${supabaseUrl}/rest/v1/student_accounts?select=full_name,email,avatar_url,timezone&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
        );
        if (studentRow) {
          profile = studentRow;
        }
      }

      if (role === "INSTRUCTOR") {
        const instructorRow = await fetchSingleRow<AccountProfile>(
          `${supabaseUrl}/rest/v1/instructor_accounts?select=full_name,email,avatar_url,timezone&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
        );
        if (instructorRow) {
          profile = instructorRow;
        }
      }

      return NextResponse.json({
        profile: {
          fullName: profile.full_name ?? "",
          email: profile.email ?? "",
          avatarUrl: profile.avatar_url ?? null,
          timezone: profile.timezone ?? null,
          role,
        },
        preferences: mergePreferences(preferencesRow?.preferences),
      });
    }

    const student = await getStudentFromCookieSession(request);
    if (!student) {
      throw new HttpError(401, "Missing valid authentication context.");
    }

    return NextResponse.json({
      profile: {
        fullName: student.full_name ?? "",
        email: student.email ?? "",
        avatarUrl: student.avatar_url ?? null,
        timezone: student.timezone ?? null,
        role: "STUDENT",
      },
      preferences: mergePreferences(null),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load account settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const payload = settingsSchema.parse(await request.json());
    const authorization = request.headers.get("authorization");

    if (authorization?.startsWith("Bearer ")) {
      const authedUser = await getAuthedUser(request);
      const role = normalizeRole(authedUser.user_metadata?.role);
      const email = normalizeEmail(authedUser.email);

      await upsertJsonRow(`${supabaseUrl}/rest/v1/account_preferences?on_conflict=auth_user_id`, {
        auth_user_id: authedUser.id,
        role,
        full_name: payload.fullName,
        avatar_url: payload.avatarUrl ?? null,
        timezone: payload.timezone ?? null,
        preferences: payload.preferences,
      });

      if (role === "STUDENT") {
        await patchRows(
          `${supabaseUrl}/rest/v1/student_accounts?auth_user_id=eq.${encodeURIComponent(authedUser.id)}`,
          {
            full_name: payload.fullName,
            avatar_url: payload.avatarUrl ?? null,
            timezone: payload.timezone ?? null,
            email,
          },
        );
      }

      if (role === "INSTRUCTOR") {
        await patchRows(
          `${supabaseUrl}/rest/v1/instructor_accounts?auth_user_id=eq.${encodeURIComponent(authedUser.id)}`,
          {
            full_name: payload.fullName,
            avatar_url: payload.avatarUrl ?? null,
            timezone: payload.timezone ?? null,
            email,
          },
        );
      }

      const adminUpdateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authedUser.id}`, {
        method: "PUT",
        headers: {
          ...getSupabaseHeaders(),
        },
        body: JSON.stringify({
          email,
          user_metadata: {
            full_name: payload.fullName,
            role,
            avatar_url: payload.avatarUrl ?? null,
            timezone: payload.timezone ?? null,
          },
        }),
      });

      if (!adminUpdateResponse.ok) {
        throw new Error(await adminUpdateResponse.text());
      }

      return NextResponse.json({ ok: true });
    }

    const student = await getStudentFromCookieSession(request);
    if (!student) {
      throw new HttpError(401, "Missing valid authentication context.");
    }

    await patchRows(`${supabaseUrl}/rest/v1/student_accounts?id=eq.${encodeURIComponent(student.id)}`, {
      full_name: payload.fullName,
      avatar_url: payload.avatarUrl ?? null,
      timezone: payload.timezone ?? null,
      email: normalizeEmail(student.email),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    if (error instanceof HttpError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save account settings." },
      { status: 500 },
    );
  }
}
