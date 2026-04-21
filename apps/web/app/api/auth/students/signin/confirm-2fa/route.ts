import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createStudentSessionToken, getStudentSessionCookieName } from "@/lib/student-session";
import { markBackupCodeUsed, fetchUnusedBackupCodes, ensureStudentSecuritySettings, fetchStudentSecuritySettings, logStudentSecurityEvent, updateStudentSecuritySettings } from "@/lib/student-security-store";
import { verifyBackupCode, verifyTotpCode } from "@/lib/account-security";
import {
  createLoginChallengeToken,
  generateLoginEmailCode,
  getStudentLoginChallengeCookieName,
  hashLoginEmailCode,
  maskEmail,
  verifyLoginChallengeToken,
  verifyLoginEmailCode,
  type TwoFactorMethod,
} from "@/lib/login-2fa";
import { generateLoginTwoFactorEmail } from "@/lib/email-templates";

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
  intent: z.enum(["verify", "send_email_code"]).optional().default("verify"),
  method: z.enum(["totp", "email"]),
  code: z.string().trim().min(6).max(12).optional(),
  backupCode: z.string().trim().min(6).max(32).optional(),
});

function getEmailCodeExpiryMinutes() {
  return 10;
}

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

async function sendLoginCodeEmail(input: { email: string; fullName: string; code: string }) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;
  const html = generateLoginTwoFactorEmail({
    fullName: input.fullName,
    email: input.email,
    verificationCode: input.code,
    expiresInMinutes: getEmailCodeExpiryMinutes(),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Cod autentificare DevAtlas",
      reply_to: replyTo,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend login 2FA email failed: ${await response.text()}`);
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(getStudentLoginChallengeCookieName())?.value ?? null;
    const challenge = verifyLoginChallengeToken(challengeToken);

    if (!challenge || challenge.actorType !== "student") {
      return NextResponse.json({ message: "Missing 2FA challenge." }, { status: 401 });
    }

    const payload = confirmSchema.parse(await request.json());
    if (!challenge.methods.includes(payload.method)) {
      return NextResponse.json({ message: "Metoda selectată nu este disponibilă." }, { status: 400 });
    }

    const student = await fetchStudentAccount(supabaseUrl, challenge.actorId);

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
    const typedSecurity = security as StudentSecurityRow | null;

    if (!typedSecurity?.totp_enabled || !typedSecurity.totp_secret) {
      if (payload.method === "totp") {
        return NextResponse.json({ message: "2FA nu este activată pentru acest cont." }, { status: 409 });
      }
    }

    const totpSecret = typedSecurity?.totp_secret ?? null;
    const totpLastUsedCounter = typedSecurity?.totp_last_used_counter ?? null;

    if (payload.intent === "send_email_code") {
      const code = generateLoginEmailCode();
      const emailCodeHash = hashLoginEmailCode(student.email, code);
      const emailCodeExpiresAt = Date.now() + getEmailCodeExpiryMinutes() * 60 * 1000;
      const nextChallengeToken = createLoginChallengeToken({
        actorType: "student",
        actorId: student.id,
        email: student.email,
        fullName: student.full_name,
        rememberMe: challenge.rememberMe,
        methods: challenge.methods as TwoFactorMethod[],
        emailCodeHash,
        emailCodeExpiresAt,
        ttlSeconds: 60 * 10,
      });

      await sendLoginCodeEmail({
        email: student.email,
        fullName: student.full_name,
        code,
      });

      const response = NextResponse.json({
        ok: true,
        message: `Am trimis codul la ${maskEmail(student.email)}.`,
      });

      response.cookies.set({
        name: getStudentLoginChallengeCookieName(),
        value: nextChallengeToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
      });

      return response;
    }

    let verified = false;
    let usedBackupCode = false;

    if (payload.method === "totp" && payload.code && totpSecret) {
      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      if (totpLastUsedCounter !== null && totpLastUsedCounter === currentCounter) {
        return NextResponse.json({ message: "Codul 2FA a fost deja folosit." }, { status: 403 });
      }

      verified = verifyTotpCode({ secret: totpSecret, code: payload.code });
    }

    if (payload.method === "totp" && !verified && payload.backupCode) {
      const unusedCodes = await fetchUnusedBackupCodes(supabaseUrl, student.id);
      const matchingCode = unusedCodes.find((row) => verifyBackupCode(payload.backupCode ?? "", row.code_hash));

      if (matchingCode) {
        await markBackupCodeUsed(supabaseUrl, student.id, matchingCode.code_hash);
        verified = true;
        usedBackupCode = true;
      }
    }

    if (payload.method === "email") {
      if (!payload.code) {
        return NextResponse.json({ message: "Introdu codul primit pe email." }, { status: 400 });
      }

      if (!challenge.emailCodeHash || !challenge.emailCodeExpiresAt || challenge.emailCodeExpiresAt < Date.now()) {
        return NextResponse.json({ message: "Codul pe email a expirat. Cere unul nou." }, { status: 410 });
      }

      verified = verifyLoginEmailCode(student.email, payload.code, challenge.emailCodeHash);
    }

    if (!verified) {
      await logStudentSecurityEvent(supabaseUrl, student.id, "totp_login_failed", {});
      return NextResponse.json({ message: "Codul 2FA este invalid." }, { status: 403 });
    }

    if (payload.method === "totp") {
      await updateStudentSecuritySettings(supabaseUrl, student.id, {
        totp_last_used_at: new Date().toISOString(),
        totp_last_used_counter: Math.floor(Date.now() / 1000 / 30),
      });
      await logStudentSecurityEvent(supabaseUrl, student.id, usedBackupCode ? "totp_backup_code_used" : "totp_login_verified", {});
    } else {
      await logStudentSecurityEvent(supabaseUrl, student.id, "email_2fa_login_verified", {});
    }

    const response = NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        email: student.email,
        fullName: student.full_name,
      },
    });

    const ttlSeconds = challenge.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 8;
    response.cookies.set({
      name: getStudentSessionCookieName(),
      value: createStudentSessionToken({
        studentId: student.id,
        email: student.email,
        fullName: student.full_name,
        ttlSeconds,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ttlSeconds,
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
