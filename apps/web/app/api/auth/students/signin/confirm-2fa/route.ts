import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createStudentSessionToken, getStudentLoginChallengeCookieName, getStudentSessionCookieName, verifyStudentLoginChallengeToken } from "@/lib/student-session";
import { markBackupCodeUsed, fetchUnusedBackupCodes, ensureStudentSecuritySettings, fetchStudentSecuritySettings, logStudentSecurityEvent, updateStudentSecuritySettings } from "@/lib/student-security-store";
import { verifyBackupCode, verifyTotpCode } from "@/lib/account-security";

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
};

type StudentSecurityRow = {
  totp_enabled: boolean;
  totp_secret: string | null;
  totp_last_used_counter: number | null;
};

const confirmSchema = z.object({
  code: z.string().trim().min(6).max(12).optional(),
  backupCode: z.string().trim().min(6).max(32).optional(),
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

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(getStudentLoginChallengeCookieName())?.value ?? null;
    const challenge = verifyStudentLoginChallengeToken(challengeToken);

    if (!challenge) {
      return NextResponse.json({ message: "Missing 2FA challenge." }, { status: 401 });
    }

    const payload = confirmSchema.parse(await request.json());
    const student = await fetchStudentAccount(supabaseUrl, challenge.studentId);

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
    const typedSecurity = security as StudentSecurityRow | null;

    if (!typedSecurity?.totp_enabled || !typedSecurity.totp_secret) {
      return NextResponse.json({ message: "2FA nu este activată pentru acest cont." }, { status: 409 });
    }

    let verified = false;
    let usedBackupCode = false;

    if (payload.code) {
      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      if (typedSecurity.totp_last_used_counter !== null && typedSecurity.totp_last_used_counter === currentCounter) {
        return NextResponse.json({ message: "Codul 2FA a fost deja folosit." }, { status: 403 });
      }

      verified = verifyTotpCode({ secret: typedSecurity.totp_secret, code: payload.code });
    }

    if (!verified && payload.backupCode) {
      const unusedCodes = await fetchUnusedBackupCodes(supabaseUrl, student.id);
      const matchingCode = unusedCodes.find((row) => verifyBackupCode(payload.backupCode ?? "", row.code_hash));

      if (matchingCode) {
        await markBackupCodeUsed(supabaseUrl, student.id, matchingCode.code_hash);
        verified = true;
        usedBackupCode = true;
      }
    }

    if (!verified) {
      await logStudentSecurityEvent(supabaseUrl, student.id, "totp_login_failed", {});
      return NextResponse.json({ message: "Codul 2FA este invalid." }, { status: 403 });
    }

    await updateStudentSecuritySettings(supabaseUrl, student.id, {
      totp_last_used_at: new Date().toISOString(),
      totp_last_used_counter: Math.floor(Date.now() / 1000 / 30),
    });
    await logStudentSecurityEvent(supabaseUrl, student.id, usedBackupCode ? "totp_backup_code_used" : "totp_login_verified", {});

    const response = NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        email: student.email,
        fullName: student.full_name,
      },
    });

    response.cookies.set({
      name: getStudentSessionCookieName(),
      value: createStudentSessionToken({
        studentId: student.id,
        email: student.email,
        fullName: student.full_name,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set({
      name: getStudentLoginChallengeCookieName(),
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to confirm 2FA." },
      { status: 500 },
    );
  }
}
