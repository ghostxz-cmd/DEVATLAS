import { NextResponse } from "next/server";
import { z } from "zod";
import { hashStudentPassword, verifyStudentPassword } from "@/lib/student-password";
import { createStudentSessionToken, getStudentSessionCookieName } from "@/lib/student-session";

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
  status: string;
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

export async function POST(request: Request) {
  try {
    const payload = signInSchema.parse(await request.json());
    const email = normalizeEmail(payload.email);
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const studentResponse = await fetch(
      `${supabaseUrl}/rest/v1/student_accounts?select=id,email,full_name,password_hash,status&email=eq.${encodeURIComponent(email)}&limit=1`,
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

    if (!student.password_hash || !verifyStudentPassword(payload.password, student.password_hash)) {
      return NextResponse.json({ message: "Email sau parolă invalidă." }, { status: 401 });
    }

    // Opportunistic migration: if hash format is legacy/invalid, rewrite a strong hash after successful login.
    if (!student.password_hash.startsWith("scrypt:")) {
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
        ttlSeconds: payload.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 8,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: payload.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 8,
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
