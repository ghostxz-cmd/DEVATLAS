import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStudentVerificationEmail } from "@/lib/email-templates";
import { getAppBaseUrl } from "@/lib/app-base-url";

const sendVerificationSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(320),
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

function hashVerificationCode(email: string, code: string) {
  const pepper = process.env.AUTH_VERIFICATION_PEPPER ?? "devatlas-student-email-verification";
  return crypto.createHash("sha256").update(`${normalizeEmail(email)}:${code}:${pepper}`).digest("hex");
}

async function sendEmail(input: {
  to: string;
  fullName: string;
  verificationCode: string;
  verifyUrl?: string;
}) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;
  const html = generateStudentVerificationEmail({
    fullName: input.fullName,
    email: input.to,
    verificationCode: input.verificationCode,
    expiresInMinutes: 15,
    verifyUrl: input.verifyUrl,
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
      subject: "Cod de verificare cont DevAtlas",
      reply_to: replyTo,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend verification email failed: ${errorText}`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = sendVerificationSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const email = normalizeEmail(payload.email);
    const fullName = payload.fullName.trim();

    const existingUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: getSupabaseHeaders() },
    );

    if (!existingUserResponse.ok) {
      return NextResponse.json({ message: await existingUserResponse.text() }, { status: 502 });
    }

    const existingUsers = (await existingUserResponse.json()) as Array<{ id: string; email: string }>;
    if (existingUsers.length > 0) {
      return NextResponse.json({ message: "Contul există deja pentru acest email." }, { status: 409 });
    }

    const verificationCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashVerificationCode(email, verificationCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/student_email_verifications?on_conflict=email`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        email,
        full_name: fullName,
        code_hash: codeHash,
        expires_at: expiresAt,
        verified_at: null,
        attempts: 0,
      }),
    });

    if (!upsertResponse.ok) {
      return NextResponse.json({ message: await upsertResponse.text() }, { status: 502 });
    }

    await sendEmail({
      to: email,
      fullName,
      verificationCode,
      verifyUrl: `${getAppBaseUrl(request)}/auth/elevi/signup`,
    });

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send verification code." },
      { status: 500 },
    );
  }
}