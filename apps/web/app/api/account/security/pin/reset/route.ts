import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStudentPinResetEmail } from "@/lib/email-templates";
import { createSecurityUnlockToken, hashSecurityPin, verifySecurityPin } from "@/lib/account-security";
import { getAppBaseUrl } from "@/lib/app-base-url";
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

const requestSchema = z.object({});
const confirmSchema = z.object({
  code: z.string().trim().length(6),
  newPin: z.string().trim().min(4).max(12),
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPinResetCode(studentId: string, code: string) {
  const pepper = process.env.STUDENT_SECURITY_PIN_RESET_PEPPER ?? "devatlas-student-security-pin-reset";
  return crypto.createHash("sha256").update(`${studentId}:${code}:${pepper}`).digest("hex");
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

async function sendPinResetEmail(input: { to: string; fullName: string; resetCode: string }) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;
  const html = generateStudentPinResetEmail({
    fullName: input.fullName,
    email: input.to,
    resetCode: input.resetCode,
    expiresInMinutes: 15,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Cod resetare PIN DevAtlas",
      reply_to: replyTo,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend pin reset email failed: ${await response.text()}`);
  }
}

export async function POST(request: Request) {
  try {
    requestSchema.parse(await request.json().catch(() => ({})));
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const email = normalizeEmail(context.email);
    const resetCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashPinResetCode(context.accountId, resetCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await updateSecuritySettings(context, {
      pin_reset_code_hash: codeHash,
      pin_reset_expires_at: expiresAt,
      pin_reset_attempts: 0,
      pin_reset_requested_at: new Date().toISOString(),
    });

    await sendPinResetEmail({
      to: email,
      fullName: context.fullName,
      resetCode,
    });

    await logSecurityEvent(context, "pin_reset_requested", {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send PIN reset code." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const payload = confirmSchema.parse(await request.json());
    const { security } = context;

    if (!security.pin_reset_code_hash || !security.pin_reset_expires_at) {
      return NextResponse.json({ message: "Nu există un cod PIN activ." }, { status: 409 });
    }

    if (new Date(security.pin_reset_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ message: "Codul a expirat. Solicită unul nou." }, { status: 410 });
    }

    if (security.pin_reset_attempts >= 5) {
      return NextResponse.json({ message: "Prea multe încercări. Solicită un cod nou." }, { status: 429 });
    }

    const expectedHash = hashPinResetCode(context.accountId, payload.code);
    if (!crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(security.pin_reset_code_hash))) {
      await updateSecuritySettings(context, {
        pin_reset_attempts: security.pin_reset_attempts + 1,
      });
      await logSecurityEvent(context, "pin_reset_failed", {});
      return NextResponse.json({ message: "Codul PIN este invalid." }, { status: 403 });
    }

    await updateSecuritySettings(context, {
      pin_hash: hashSecurityPin(payload.newPin),
      pin_enabled: true,
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_last_verified_at: new Date().toISOString(),
      last_unlock_at: new Date().toISOString(),
      require_pin_for_sensitive_changes: true,
      pin_reset_code_hash: null,
      pin_reset_expires_at: null,
      pin_reset_attempts: 0,
      pin_reset_requested_at: null,
    });

    await logSecurityEvent(context, "pin_reset_confirmed", {});

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "devatlas_student_security_unlock",
      value: createSecurityUnlockToken({ studentId: context.accountId, ttlSeconds: 60 * 5 }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to reset PIN." },
      { status: 500 },
    );
  }
}
