import { NextResponse } from "next/server";
import { z } from "zod";

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
      profile,
      role,
      preferences: mergePreferences(preferencesRow?.preferences),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load account settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const authedUser = await getAuthedUser(request);
    const role = normalizeRole(authedUser.user_metadata?.role);
    const email = normalizeEmail(authedUser.email);
    const payload = settingsSchema.parse(await request.json());

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save account settings." },
      { status: 500 },
    );
  }
}
