import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashStudentPassword } from "@/lib/student-password";

const confirmResetSchema = z.object({
  email: z.string().email().max(320),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(72),
});

type PasswordResetRow = {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  used_at: string | null;
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

async function getResetRow(email: string) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/student_password_resets?select=*&email=eq.${encodeURIComponent(normalizeEmail(email))}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as PasswordResetRow[];
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const payload = confirmResetSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const email = normalizeEmail(payload.email);
    const resetRow = await getResetRow(email);

    if (!resetRow) {
      return NextResponse.json({ message: "Nu există un cod activ pentru acest email." }, { status: 404 });
    }

    if (resetRow.used_at) {
      return NextResponse.json({ message: "Codul a fost deja folosit." }, { status: 409 });
    }

    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ message: "Codul a expirat. Solicită un cod nou." }, { status: 410 });
    }

    if (resetRow.attempts >= 5) {
      return NextResponse.json({ message: "Prea multe încercări. Solicită un cod nou." }, { status: 429 });
    }

    const expectedHash = hashResetCode(email, payload.code);
    if (expectedHash !== resetRow.code_hash) {
      await fetch(`${supabaseUrl}/rest/v1/student_password_resets?id=eq.${encodeURIComponent(resetRow.id)}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ attempts: resetRow.attempts + 1 }),
      });

      return NextResponse.json({ message: "Codul introdus nu este corect." }, { status: 400 });
    }

    const updatePasswordResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_accounts?email=eq.${encodeURIComponent(email)}`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          password_hash: hashStudentPassword(payload.newPassword),
        }),
      },
    );

    if (!updatePasswordResponse.ok) {
      return NextResponse.json({ message: await updatePasswordResponse.text() }, { status: 502 });
    }

    const profileCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_accounts?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: getSupabaseHeaders() },
    );

    if (!profileCheckResponse.ok) {
      return NextResponse.json({ message: await profileCheckResponse.text() }, { status: 502 });
    }

    const matchingProfiles = (await profileCheckResponse.json()) as Array<{ id: string }>;
    if (matchingProfiles.length === 0) {
      return NextResponse.json({ message: "Contul de elev nu există." }, { status: 404 });
    }

    await fetch(`${supabaseUrl}/rest/v1/student_password_resets?id=eq.${encodeURIComponent(resetRow.id)}`, {
      method: "PATCH",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500 },
    );
  }
}