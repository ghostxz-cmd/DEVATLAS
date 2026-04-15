import { NextResponse } from "next/server";
import { z } from "zod";
import { hashStudentPassword, verifyStudentPassword } from "@/lib/student-password";
import { ensureStudentSecuritySettings, fetchStudentSecuritySettings } from "@/lib/student-security-store";
import {
  createLoginChallengeToken,
  generateLoginEmailCode,
  getStudentLoginChallengeCookieName,
  hashLoginEmailCode,
  maskEmail,
  type TwoFactorMethod,
} from "@/lib/login-2fa";
import { generateLoginTwoFactorEmail } from "@/lib/email-templates";

const signInSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(72),
  rememberMe: z.boolean().optional().default(true),
});

type StudentRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string | null;
  auth_user_id: string | null;
  status: string;
};

type StudentSecurityRow = {
  totp_enabled: boolean;
  totp_secret: string | null;
};

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function verifyWithSupabaseAuth(input: { supabaseUrl: string; email: string; password: string; authUserId: string | null }) {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    return false;
  }

  const response = await fetch(`${input.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as { user?: { id?: string } };
  if (!payload.user?.id) {
    return false;
  }

  if (input.authUserId && payload.user.id !== input.authUserId) {
    return false;
  }

  return true;
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
    const payload = signInSchema.parse(await request.json());
    const email = normalizeEmail(payload.email);
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const studentResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,password_hash,auth_user_id,status&email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: getSupabaseHeaders() },
    );

    if (!studentResponse.ok) {
      return NextResponse.json({ message: await studentResponse.text() }, { status: 502 });
    }

    const students = (await studentResponse.json()) as StudentRow[];
    const student = students[0] ?? null;

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ message: "Email sau parolă invalidă." }, { status: 401 });
    }

    let isPasswordValid = Boolean(student.password_hash && verifyStudentPassword(payload.password, student.password_hash));

    if (!isPasswordValid && !student.password_hash) {
      isPasswordValid = await verifyWithSupabaseAuth({
        supabaseUrl,
        email,
        password: payload.password,
        authUserId: student.auth_user_id,
      });
    }

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Email sau parolă invalidă." }, { status: 401 });
    }

    const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
    const hasTotp = Boolean((security as StudentSecurityRow | null)?.totp_enabled && (security as StudentSecurityRow | null)?.totp_secret);

    // Opportunistic migration: if hash format is legacy/invalid, rewrite a strong hash after successful login.
    if (!student.password_hash || !student.password_hash.startsWith("scrypt:")) {
      await fetch(`${supabaseUrl}/rest/v1/student_accounts?id=eq.${encodeURIComponent(student.id)}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          password_hash: hashStudentPassword(payload.password),
        }),
      });
    }

    const methods: TwoFactorMethod[] = hasTotp ? ["totp", "email"] : ["email"];
    const preferredMethod: TwoFactorMethod = hasTotp ? "totp" : "email";
    let emailCodeHash: string | null = null;
    let emailCodeExpiresAt: number | null = null;

    if (preferredMethod === "email") {
      const code = generateLoginEmailCode();
      emailCodeHash = hashLoginEmailCode(student.email, code);
      emailCodeExpiresAt = Date.now() + getEmailCodeExpiryMinutes() * 60 * 1000;
      await sendLoginCodeEmail({
        email: student.email,
        fullName: student.full_name,
        code,
      });
    }

    const challengeToken = createLoginChallengeToken({
      actorType: "student",
      actorId: student.id,
      email: student.email,
      fullName: student.full_name,
      rememberMe: payload.rememberMe,
      methods,
      emailCodeHash,
      emailCodeExpiresAt,
      ttlSeconds: 60 * 10,
    });

    const response = NextResponse.json({
      ok: true,
      requiresTwoFactor: true,
      methods,
      preferredMethod,
      maskedEmail: maskEmail(student.email),
      student: {
        id: student.id,
        email: student.email,
        fullName: student.full_name,
      },
    });

    response.cookies.set({
      name: getStudentLoginChallengeCookieName(),
      value: challengeToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nu am putut face autentificarea." },
      { status: 500 },
    );
  }
}
