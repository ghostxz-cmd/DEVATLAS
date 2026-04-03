import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStudentPasswordResetEmail } from "@/lib/email-templates";
import { getAppBaseUrl } from "@/lib/app-base-url";

const requestResetSchema = z.object({
  email: z.string().email().max(320),
});

type StudentProfile = {
  email: string;
  full_name: string;
  supabase_auth_id: string | null;
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashResetCode(email: string, code: string) {
  const pepper = process.env.AUTH_PASSWORD_RESET_PEPPER ?? "devatlas-student-password-reset";
  return crypto.createHash("sha256").update(`${normalizeEmail(email)}:${code}:${pepper}`).digest("hex");
}

async function sendEmail(input: {
  to: string;
  fullName: string;
  resetCode: string;
  resetUrl?: string;
}) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;
  const html = generateStudentPasswordResetEmail({
    fullName: input.fullName,
    email: input.to,
    resetCode: input.resetCode,
    expiresInMinutes: 15,
    resetUrl: input.resetUrl,
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
      subject: "Cod resetare parolă DevAtlas",
      reply_to: replyTo,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend password reset email failed: ${errorText}`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = requestResetSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const email = normalizeEmail(payload.email);

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?select=email,full_name,supabase_auth_id&email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: getSupabaseHeaders() },
    );

    if (!profileResponse.ok) {
      return NextResponse.json({ message: await profileResponse.text() }, { status: 502 });
    }

    const profiles = (await profileResponse.json()) as StudentProfile[];
    const profile = profiles[0] ?? null;

    // Return success even if account is missing to avoid account enumeration.
    if (!profile || !profile.supabase_auth_id) {
      return NextResponse.json({ ok: true });
    }

    const resetCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashResetCode(email, resetCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/student_password_resets?on_conflict=email`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        email,
        code_hash: codeHash,
        attempts: 0,
        expires_at: expiresAt,
        used_at: null,
        auth_user_id: profile.supabase_auth_id,
      }),
    });

    if (!upsertResponse.ok) {
      return NextResponse.json({ message: await upsertResponse.text() }, { status: 502 });
    }

    await sendEmail({
      to: email,
      fullName: profile.full_name,
      resetCode,
      resetUrl: `${getAppBaseUrl(request)}/auth/elevi/forgot-password`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send reset code." },
      { status: 500 },
    );
  }
}