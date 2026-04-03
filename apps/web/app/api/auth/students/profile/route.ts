import { NextResponse } from "next/server";
import { z } from "zod";

const ensureStudentSchema = z.object({
  supabaseAuthId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
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

export async function POST(request: Request) {
  try {
    const payload = ensureStudentSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const existingByEmailResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_accounts?select=id,email&email=eq.${encodeURIComponent(payload.email)}&limit=1`,
      { headers: getSupabaseHeaders() },
    );

    if (!existingByEmailResponse.ok) {
      return NextResponse.json({ message: await existingByEmailResponse.text() }, { status: 502 });
    }

    const existingByEmail = (await existingByEmailResponse.json()) as Array<{ id: string; email: string }>;
    if (existingByEmail.length > 0) {
      return NextResponse.json({ ok: true, created: false });
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/student_accounts`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        auth_user_id: payload.supabaseAuthId,
        email: payload.email,
        full_name: payload.fullName,
        status: "PENDING_EMAIL_VERIFICATION",
      }),
    });

    if (!insertResponse.ok) {
      return NextResponse.json({ message: await insertResponse.text() }, { status: 502 });
    }

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create student profile." },
      { status: 500 },
    );
  }
}
