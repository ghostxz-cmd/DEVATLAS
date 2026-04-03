import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const confirmVerificationSchema = z.object({
  email: z.string().email().max(320),
  code: z.string().length(6),
  password: z.string().min(8).max(72),
});

type VerificationRow = {
  id: string;
  email: string;
  full_name: string;
  code_hash: string;
  expires_at: string;
  verified_at: string | null;
  attempts: number;
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

function hashVerificationCode(email: string, code: string) {
  const pepper = process.env.AUTH_VERIFICATION_PEPPER ?? "devatlas-student-email-verification";
  return crypto.createHash("sha256").update(`${normalizeEmail(email)}:${code}:${pepper}`).digest("hex");
}

async function getVerificationRow(email: string) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/student_email_verifications?select=*&email=eq.${encodeURIComponent(normalizeEmail(email))}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = (await response.json()) as VerificationRow[];
  return rows[0] ?? null;
}

async function createStudentAccount(input: { email: string; password: string; fullName: string }) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: normalizeEmail(input.email),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        role: "STUDENT",
      },
    }),
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    const isEmailExists =
      authResponse.status === 422 &&
      (errorText.includes("email_exists") || errorText.toLowerCase().includes("already been registered"));

    if (isEmailExists) {
      return {
        authUserId: null,
        created: false,
      };
    }

    throw new Error(errorText);
  }

  const authUser = await authResponse.json();
  const authUserId = (authUser?.id ?? authUser?.user?.id) as string | undefined;

  if (!authUserId) {
    throw new Error("Supabase auth user creation returned an invalid payload.");
  }

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/student_accounts`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      auth_user_id: authUserId,
      email: normalizeEmail(input.email),
      full_name: input.fullName,
      status: "ACTIVE",
    }),
  });

  if (!profileResponse.ok) {
    throw new Error(await profileResponse.text());
  }

  return {
    authUserId,
    created: true,
  };
}

export async function POST(request: Request) {
  try {
    const payload = confirmVerificationSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const email = normalizeEmail(payload.email);
    const verificationRow = await getVerificationRow(email);

    if (!verificationRow) {
      return NextResponse.json({ message: "Nu am găsit un cod activ pentru acest email." }, { status: 404 });
    }

    if (verificationRow.verified_at) {
      return NextResponse.json({ message: "Codul a fost deja folosit." }, { status: 409 });
    }

    if (new Date(verificationRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ message: "Codul a expirat. Trimite unul nou." }, { status: 410 });
    }

    if (verificationRow.attempts >= 5) {
      return NextResponse.json({ message: "Ai depășit numărul maxim de încercări. Trimite un cod nou." }, { status: 429 });
    }

    const expectedHash = hashVerificationCode(email, payload.code);
    if (expectedHash !== verificationRow.code_hash) {
      await fetch(`${supabaseUrl}/rest/v1/student_email_verifications?id=eq.${encodeURIComponent(verificationRow.id)}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ attempts: verificationRow.attempts + 1 }),
      });

      return NextResponse.json({ message: "Codul introdus nu este corect." }, { status: 400 });
    }

    const accountResult = await createStudentAccount({
      email,
      password: payload.password,
      fullName: verificationRow.full_name,
    });

    if (accountResult.created) {
      await fetch(`${supabaseUrl}/rest/v1/student_accounts?email=eq.${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
    }

    await fetch(`${supabaseUrl}/rest/v1/student_email_verifications?id=eq.${encodeURIComponent(verificationRow.id)}`, {
      method: "PATCH",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ verified_at: new Date().toISOString() }),
    });

    return NextResponse.json({
      ok: true,
      userId: accountResult.authUserId,
      accountAlreadyExists: !accountResult.created,
      message: accountResult.created
        ? "Contul a fost creat cu succes."
        : "Contul exista deja pentru acest email. Folosește login sau resetare parolă.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to verify code." },
      { status: 500 },
    );
  }
}