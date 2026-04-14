import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";
import {
  countUnusedBackupCodes,
  ensureStudentSecuritySettings,
  fetchStudentSecuritySettings,
} from "@/lib/student-security-store";
import {
  countUnusedInstructorBackupCodes,
  ensureInstructorSecuritySettings,
} from "@/lib/instructor-security-store";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
  };
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

async function fetchStudentAccount(supabaseUrl: string, studentId: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,status&id=eq.${encodeURIComponent(studentId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as Array<{ id: string; email: string; full_name: string; status: string }>;
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

  const rows = (await response.json()) as Array<{ id: string; email: string; full_name: string; status: string }>;
  return rows[0] ?? null;
}

async function fetchInstructorByAuthUserId(supabaseUrl: string, authUserId: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/instructor_accounts?select=id,email,full_name,status&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as Array<{ id: string; email: string; full_name: string; status: string }>;
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

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const authedUser = await getAuthedUser(request);
    if (authedUser) {
      const role = normalizeRole(authedUser.user_metadata?.role);

      if (role === "INSTRUCTOR") {
        const instructor = await fetchInstructorByAuthUserId(supabaseUrl, authedUser.id);
        if (!instructor || instructor.status !== "ACTIVE") {
          return NextResponse.json({ message: "Instructor account not found." }, { status: 404 });
        }

        const security = await ensureInstructorSecuritySettings(supabaseUrl, authedUser.id, instructor.id, role);
        const backupCodesRemaining = await countUnusedInstructorBackupCodes(supabaseUrl, authedUser.id, instructor.id);

        return NextResponse.json({
          profile: {
            studentId: instructor.id,
            email: instructor.email,
            fullName: instructor.full_name,
          },
          security: {
            pinEnabled: security.pin_enabled,
            pinLockedUntil: security.pin_locked_until,
            pinFailedAttempts: security.pin_failed_attempts,
            pinLastVerifiedAt: security.pin_last_verified_at,
            totpEnabled: security.totp_enabled,
            totpConfirmedAt: security.totp_confirmed_at,
            totpLastUsedAt: security.totp_last_used_at,
            totpPending: Boolean(security.totp_pending_secret),
            requirePinForSensitiveChanges: security.require_pin_for_sensitive_changes,
            backupCodesRemaining,
            hasBackupCodes: backupCodesRemaining > 0,
            lastUnlockAt: security.last_unlock_at,
          },
        });
      }

      const studentByAuth = await fetchStudentByAuthUserId(supabaseUrl, authedUser.id);
      if (!studentByAuth || studentByAuth.status !== "ACTIVE") {
        return NextResponse.json({ message: "Student account not found." }, { status: 404 });
      }

      const security = (await ensureStudentSecuritySettings(supabaseUrl, studentByAuth.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, studentByAuth.id));
      if (!security) {
        return NextResponse.json({ message: "Failed to load security settings." }, { status: 500 });
      }

      const backupCodesRemaining = await countUnusedBackupCodes(supabaseUrl, studentByAuth.id);

      return NextResponse.json({
        profile: {
          studentId: studentByAuth.id,
          email: studentByAuth.email,
          fullName: studentByAuth.full_name,
        },
        security: {
          pinEnabled: security.pin_enabled,
          pinLockedUntil: security.pin_locked_until,
          pinFailedAttempts: security.pin_failed_attempts,
          pinLastVerifiedAt: security.pin_last_verified_at,
          totpEnabled: security.totp_enabled,
          totpConfirmedAt: security.totp_confirmed_at,
          totpLastUsedAt: security.totp_last_used_at,
          totpPending: Boolean(security.totp_pending_secret),
          requirePinForSensitiveChanges: security.require_pin_for_sensitive_changes,
          backupCodesRemaining,
          hasBackupCodes: backupCodesRemaining > 0,
          lastUnlockAt: security.last_unlock_at,
        },
      });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(getStudentSessionCookieName())?.value;
    const session = verifyStudentSessionToken(token);

    if (!session) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const student = await fetchStudentAccount(supabaseUrl, session.studentId);
    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
    if (!security) {
      return NextResponse.json({ message: "Failed to load security settings." }, { status: 500 });
    }

    const backupCodesRemaining = await countUnusedBackupCodes(supabaseUrl, student.id);

    return NextResponse.json({
      profile: {
        studentId: student.id,
        email: student.email,
        fullName: student.full_name,
      },
      security: {
        pinEnabled: security.pin_enabled,
        pinLockedUntil: security.pin_locked_until,
        pinFailedAttempts: security.pin_failed_attempts,
        pinLastVerifiedAt: security.pin_last_verified_at,
        totpEnabled: security.totp_enabled,
        totpConfirmedAt: security.totp_confirmed_at,
        totpLastUsedAt: security.totp_last_used_at,
        totpPending: Boolean(security.totp_pending_secret),
        requirePinForSensitiveChanges: security.require_pin_for_sensitive_changes,
        backupCodesRemaining,
        hasBackupCodes: backupCodesRemaining > 0,
        lastUnlockAt: security.last_unlock_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load security settings." },
      { status: 500 },
    );
  }
}
