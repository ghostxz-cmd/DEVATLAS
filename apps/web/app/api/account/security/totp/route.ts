import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildTotpOtpAuthUrl,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  getSecurityUnlockCookieName,
  verifySecurityUnlockToken,
  verifySecurityPin,
  verifyTotpCode,
} from "@/lib/account-security";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";
import {
  ensureStudentSecuritySettings,
  fetchStudentSecuritySettings,
  logStudentSecurityEvent,
  replaceStudentBackupCodes,
  type StudentSecuritySettingsRow,
  updateStudentSecuritySettings,
} from "@/lib/student-security-store";
import {
  ensureInstructorSecuritySettings,
  logInstructorSecurityEvent,
  replaceInstructorBackupCodes,
  type InstructorSecuritySettingsRow,
  updateInstructorSecuritySettings,
} from "@/lib/instructor-security-store";
import { cookies } from "next/headers";

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

const startSchema = z.object({
  currentPin: z.string().min(4).max(12).optional(),
});

const confirmSchema = z.object({
  code: z.string().min(6).max(12),
});

const disableSchema = z.object({
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

async function replaceBackupCodes(context: AccountContext, codeHashes: string[]) {
  if (context.kind === "instructor") {
    await replaceInstructorBackupCodes(context.supabaseUrl, context.authUserId!, context.accountId, codeHashes, context.role);
    return;
  }

  await replaceStudentBackupCodes(context.supabaseUrl, context.accountId, codeHashes);
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

function hasValidSecurityUnlock(request: Request, accountId: string) {
  const token = getCookieValue(request, getSecurityUnlockCookieName());
  const payload = verifySecurityUnlockToken(token);
  return Boolean(payload && payload.studentId === accountId);
}

function getTotpIssuer() {
  return process.env.STUDENT_TOTP_ISSUER ?? "DevAtlas";
}

export async function POST(request: Request) {
  try {
    const context = await getAccountContext(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid authentication context." }, { status: 401 });
    }

    const payload = startSchema.parse(await request.json());
    const { security } = context;

    if (security.pin_enabled && security.pin_hash) {
      const pinIsValid = payload.currentPin ? verifySecurityPin(payload.currentPin, security.pin_hash) : false;
      if (!pinIsValid && !hasValidSecurityUnlock(request, context.accountId)) {
        return NextResponse.json(
          { message: "Verifică PIN-ul sau deblochează contul înainte să generezi QR-ul." },
          { status: 403 },
        );
      }
    }

    if (security.totp_enabled && !security.totp_pending_secret) {
      return NextResponse.json({ message: "2FA este deja activată." }, { status: 409 });
    }

    const secret = generateTotpSecret();
    await updateSecuritySettings(context, {
      totp_pending_secret: secret,
    });

    await logSecurityEvent(context, "totp_setup_started", {});

    return NextResponse.json({
      ok: true,
      totp: {
        secret,
        issuer: getTotpIssuer(),
        otpauthUrl: buildTotpOtpAuthUrl({
          issuer: getTotpIssuer(),
          accountName: context.email,
          secret,
        }),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to start TOTP setup." },
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
    const pendingSecret = security.totp_pending_secret;

    if (!pendingSecret) {
      return NextResponse.json({ message: "Nu există o configurare 2FA în așteptare." }, { status: 409 });
    }

    if (!verifyTotpCode({ secret: pendingSecret, code: payload.code })) {
      await logSecurityEvent(context, "totp_setup_failed", {});
      return NextResponse.json({ message: "Codul 2FA este invalid." }, { status: 403 });
    }

    const backupCodes = generateBackupCodes();
    await updateSecuritySettings(context, {
      totp_secret: pendingSecret,
      totp_pending_secret: null,
      totp_enabled: true,
      totp_confirmed_at: new Date().toISOString(),
      totp_last_used_at: new Date().toISOString(),
      totp_last_used_counter: Math.floor(Date.now() / 1000 / 30),
    });
    await replaceBackupCodes(context, backupCodes.map((code) => hashBackupCode(code)));
    await logSecurityEvent(context, "totp_enabled", { backupCodes: backupCodes.length });

    return NextResponse.json({
      ok: true,
      backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to confirm TOTP setup." },
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

    const payload = disableSchema.parse(await request.json());
    const { security } = context;

    if (!security.totp_enabled || !security.totp_secret) {
      return NextResponse.json({ message: "2FA nu este activată." }, { status: 409 });
    }

    if (security.pin_enabled && security.pin_hash) {
      const pinIsValid = payload.currentPin ? verifySecurityPin(payload.currentPin, security.pin_hash) : false;
      if (!pinIsValid && !hasValidSecurityUnlock(request, context.accountId)) {
        return NextResponse.json(
          { message: "Verifică PIN-ul sau deblochează contul înainte să oprești 2FA." },
          { status: 403 },
        );
      }
    }

    await updateSecuritySettings(context, {
      totp_secret: null,
      totp_pending_secret: null,
      totp_enabled: false,
      totp_confirmed_at: null,
      totp_last_used_at: null,
      totp_last_used_counter: null,
    });

    await replaceBackupCodes(context, []);
    await logSecurityEvent(context, "totp_disabled", {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to disable TOTP." },
      { status: 500 },
    );
  }
}
