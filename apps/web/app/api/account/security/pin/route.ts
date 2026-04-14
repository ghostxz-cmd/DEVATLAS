import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSecurityUnlockToken, hashSecurityPin, verifySecurityPin } from "@/lib/account-security";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";
import {
  ensureStudentSecuritySettings,
  fetchStudentSecuritySettings,
  logStudentSecurityEvent,
  type StudentSecuritySettingsRow,
  updateStudentSecuritySettings,
} from "@/lib/student-security-store";
import {
  ensureInstructorSecuritySettings,
  logInstructorSecurityEvent,
  type InstructorSecuritySettingsRow,
  updateInstructorSecuritySettings,
} from "@/lib/instructor-security-store";

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
};

type InstructorAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  status: string;
};

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
  };
};

type AccountContext = {
  kind: "student" | "instructor";
  supabaseUrl: string;
  accountId: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  role: string;
  security: StudentSecuritySettingsRow | InstructorSecuritySettingsRow;
};

const pinSchema = z.object({
  pin: z.string().min(4).max(12),
  currentPin: z.string().min(4).max(12).optional(),
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

async function fetchStudentAccount(supabaseUrl: string, studentId: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,status&id=eq.${encodeURIComponent(studentId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as StudentAccountRow[];
  return rows[0] ?? null;
}

async function fetchStudentByAuthUserId(supabaseUrl: string, authUserId: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,status&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as StudentAccountRow[];
  return rows[0] ?? null;
}

async function fetchInstructorByAuthUserId(supabaseUrl: string, authUserId: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/instructor_accounts?select=id,auth_user_id,email,full_name,status&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as InstructorAccountRow[];
  return rows[0] ?? null;
}

function normalizeRole(role: string | undefined) {
  return (role ?? "STUDENT").trim().toUpperCase();
}

async function getAuthedUser(request: Request) {
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

  return (await response.json()) as AuthUserResponse;
}

async function getAccountContext(request: Request): Promise<AccountContext | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");

  const authedUser = await getAuthedUser(request);
  if (authedUser) {
    const role = normalizeRole(authedUser.user_metadata?.role);

    if (role === "INSTRUCTOR") {
      const instructor = await fetchInstructorByAuthUserId(supabaseUrl, authedUser.id);
      if (!instructor || instructor.status !== "ACTIVE") {
        return null;
      }

      const security = await ensureInstructorSecuritySettings(supabaseUrl, authedUser.id, instructor.id, role);
      return {
        kind: "instructor",
        supabaseUrl,
        accountId: instructor.id,
        authUserId: authedUser.id,
        email: instructor.email,
        fullName: instructor.full_name,
        role,
        security,
      };
    }

    const student = await fetchStudentByAuthUserId(supabaseUrl, authedUser.id);
    if (!student || student.status !== "ACTIVE") {
      return null;
    }

    const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
    if (!security) {
      throw new Error("Failed to load security settings.");
    }

    return {
      kind: "student",
      supabaseUrl,
      accountId: student.id,
      authUserId: authedUser.id,
      email: student.email,
      fullName: student.full_name,
      role,
      security,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getStudentSessionCookieName())?.value;
  const session = verifyStudentSessionToken(token);

  if (!session) {
    return null;
  }

  const student = await fetchStudentAccount(supabaseUrl, session.studentId);
  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
  if (!security) {
    throw new Error("Failed to load security settings.");
  }

  return {
    kind: "student",
    supabaseUrl,
    accountId: student.id,
    authUserId: null,
    email: student.email,
    fullName: student.full_name,
    role: "STUDENT",
    security,
  };
}

async function updateSecuritySettings(context: AccountContext, payload: Record<string, unknown>) {
  if (context.kind === "instructor") {
    await updateInstructorSecuritySettings(context.supabaseUrl, context.authUserId!, context.accountId, payload, context.role);
    return;
  }

  await updateStudentSecuritySettings(context.supabaseUrl, context.accountId, payload);
}

async function logSecurityEvent(context: AccountContext, eventType: string, metadata: Record<string, unknown>) {
  if (context.kind === "instructor") {
    await logInstructorSecurityEvent(context.supabaseUrl, context.authUserId!, context.accountId, eventType, metadata, context.role);
    return;
  }

  await logStudentSecurityEvent(context.supabaseUrl, context.accountId, eventType, metadata);
}

function getUnlockCookieAge() {
  return 60 * 5;
}

export async function POST(request: Request) {
  try {
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const payload = pinSchema.parse(await request.json());
    const { security } = context;

    if (security.pin_enabled && !payload.currentPin) {
      return NextResponse.json({ message: "PIN-ul curent este necesar pentru schimbare." }, { status: 403 });
    }

    if (security.pin_enabled && payload.currentPin && !verifySecurityPin(payload.currentPin, security.pin_hash)) {
      await updateSecuritySettings(context, {
        pin_failed_attempts: security.pin_failed_attempts + 1,
      });

      await logSecurityEvent(context, "pin_verify_failed", { action: "set_or_update" });
      return NextResponse.json({ message: "PIN invalid." }, { status: 403 });
    }

    const nextHash = hashSecurityPin(payload.pin);
    await updateSecuritySettings(context, {
      pin_hash: nextHash,
      pin_enabled: true,
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_last_verified_at: new Date().toISOString(),
      last_unlock_at: new Date().toISOString(),
      require_pin_for_sensitive_changes: true,
    });

    await logSecurityEvent(context, security.pin_enabled ? "pin_updated" : "pin_enabled", {});

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "devatlas_student_security_unlock",
      value: createSecurityUnlockToken({ studentId: context.accountId, ttlSeconds: getUnlockCookieAge() }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getUnlockCookieAge(),
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save PIN." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const payload = pinSchema.pick({ pin: true }).parse(await request.json());
    const { security } = context;

    if (!security.pin_enabled || !security.pin_hash) {
      return NextResponse.json({ message: "PIN-ul nu este activ." }, { status: 409 });
    }

    if (security.pin_locked_until && new Date(security.pin_locked_until).getTime() > Date.now()) {
      return NextResponse.json({ message: "PIN-ul este blocat temporar." }, { status: 423 });
    }

    if (!verifySecurityPin(payload.pin, security.pin_hash)) {
      const failedAttempts = security.pin_failed_attempts + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await updateSecuritySettings(context, {
        pin_failed_attempts: failedAttempts,
        pin_locked_until: lockUntil,
      });
      await logSecurityEvent(context, "pin_verify_failed", { action: "unlock" });

      return NextResponse.json({ message: lockUntil ? "PIN-ul a fost blocat temporar." : "PIN invalid." }, { status: lockUntil ? 423 : 403 });
    }

    await updateSecuritySettings(context, {
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_last_verified_at: new Date().toISOString(),
      last_unlock_at: new Date().toISOString(),
    });

    await logSecurityEvent(context, "pin_verified", { action: "unlock" });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "devatlas_student_security_unlock",
      value: createSecurityUnlockToken({ studentId: context.accountId, ttlSeconds: getUnlockCookieAge() }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getUnlockCookieAge(),
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to verify PIN." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const payload = pinSchema.pick({ currentPin: true }).parse(await request.json());
    const { security } = context;

    if (!security.pin_enabled || !security.pin_hash) {
      return NextResponse.json({ message: "PIN-ul nu este activ." }, { status: 409 });
    }

    if (!payload.currentPin || !verifySecurityPin(payload.currentPin, security.pin_hash)) {
      await updateSecuritySettings(context, {
        pin_failed_attempts: security.pin_failed_attempts + 1,
      });

      await logSecurityEvent(context, "pin_verify_failed", { action: "disable" });
      return NextResponse.json({ message: "PIN invalid." }, { status: 403 });
    }

    await updateSecuritySettings(context, {
      pin_hash: null,
      pin_enabled: false,
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_last_verified_at: new Date().toISOString(),
      last_unlock_at: null,
    });

    await logSecurityEvent(context, "pin_disabled", {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to disable PIN." },
      { status: 500 },
    );
  }
}
