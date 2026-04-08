import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildTotpOtpAuthUrl,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  getSecurityUnlockCookieName,
  verifySecurityUnlockToken,
  verifySecurityPin,
  verifyTotpCode,
} from "@/lib/account-security";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";
import {
  ensureStudentSecuritySettings,
  fetchStudentSecuritySettings,
  logStudentSecurityEvent,
  replaceStudentBackupCodes,
  updateStudentSecuritySettings,
} from "@/lib/student-security-store";
import { cookies } from "next/headers";

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
};

const startSchema = z.object({
  currentPin: z.string().min(4).max(12).optional(),
});

const confirmSchema = z.object({
  code: z.string().min(6).max(12),
});

const disableSchema = z.object({
  currentPin: z.string().min(4).max(12).optional(),
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

async function getStudentContext() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const cookieStore = await cookies();
  const token = cookieStore.get(getStudentSessionCookieName())?.value;
  const session = verifyStudentSessionToken(token);

  if (!session) {
    return null;
  }

  const student = await fetchStudentAccount(supabaseUrl, session.studentId);
  if (!student || student.status !== "ACTIVE") {
    return null;
  }

  const security = (await ensureStudentSecuritySettings(supabaseUrl, student.id)) ?? (await fetchStudentSecuritySettings(supabaseUrl, student.id));
  if (!security) {
    throw new Error("Failed to load security settings.");
  }

  return { supabaseUrl, student, security };
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rest.join("="));
  }

  return null;
}

function hasValidSecurityUnlock(request: Request, studentId: string) {
  const token = getCookieValue(request, getSecurityUnlockCookieName());
  const payload = verifySecurityUnlockToken(token);
  return Boolean(payload && payload.studentId === studentId);
}

function getTotpIssuer() {
  return process.env.STUDENT_TOTP_ISSUER ?? "DevAtlas";
}

export async function POST(request: Request) {
  try {
    const context = await getStudentContext();
    if (!context) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const payload = startSchema.parse(await request.json());
    const { supabaseUrl, student, security } = context;

    if (security.pin_enabled && security.pin_hash) {
      const pinIsValid = payload.currentPin ? verifySecurityPin(payload.currentPin, security.pin_hash) : false;
      if (!pinIsValid && !hasValidSecurityUnlock(request, student.id)) {
        return NextResponse.json(
          { message: "Verifică PIN-ul sau deblochează contul înainte să generezi QR-ul." },
          { status: 403 },
        );
      }
    }

    if (security.totp_enabled && !security.totp_pending_secret) {
      return NextResponse.json({ message: "2FA este deja activată." }, { status: 409 });
    }

    const secret = generateTotpSecret();
    await updateStudentSecuritySettings(supabaseUrl, student.id, {
      totp_pending_secret: secret,
    });

    await logStudentSecurityEvent(supabaseUrl, student.id, "totp_setup_started", {});

    return NextResponse.json({
      ok: true,
      totp: {
        secret,
        issuer: getTotpIssuer(),
        otpauthUrl: buildTotpOtpAuthUrl({
          issuer: getTotpIssuer(),
          accountName: student.email,
          secret,
        }),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to start TOTP setup." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getStudentContext();
    if (!context) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const payload = confirmSchema.parse(await request.json());
    const { supabaseUrl, student, security } = context;
    const pendingSecret = security.totp_pending_secret;

    if (!pendingSecret) {
      return NextResponse.json({ message: "Nu există o configurare 2FA în așteptare." }, { status: 409 });
    }

    if (!verifyTotpCode({ secret: pendingSecret, code: payload.code })) {
      await logStudentSecurityEvent(supabaseUrl, student.id, "totp_setup_failed", {});
      return NextResponse.json({ message: "Codul 2FA este invalid." }, { status: 403 });
    }

    const backupCodes = generateBackupCodes();
    await updateStudentSecuritySettings(supabaseUrl, student.id, {
      totp_secret: pendingSecret,
      totp_pending_secret: null,
      totp_enabled: true,
      totp_confirmed_at: new Date().toISOString(),
      totp_last_used_at: new Date().toISOString(),
      totp_last_used_counter: Math.floor(Date.now() / 1000 / 30),
    });
    await replaceStudentBackupCodes(supabaseUrl, student.id, backupCodes.map((code) => hashBackupCode(code)));
    await logStudentSecurityEvent(supabaseUrl, student.id, "totp_enabled", { backupCodes: backupCodes.length });

    return NextResponse.json({
      ok: true,
      backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to confirm TOTP setup." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getStudentContext();
    if (!context) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const payload = disableSchema.parse(await request.json());
    const { supabaseUrl, student, security } = context;

    if (!security.totp_enabled || !security.totp_secret) {
      return NextResponse.json({ message: "2FA nu este activată." }, { status: 409 });
    }

    if (security.pin_enabled && security.pin_hash) {
      const pinIsValid = payload.currentPin ? verifySecurityPin(payload.currentPin, security.pin_hash) : false;
      if (!pinIsValid && !hasValidSecurityUnlock(request, student.id)) {
        return NextResponse.json(
          { message: "Verifică PIN-ul sau deblochează contul înainte să oprești 2FA." },
          { status: 403 },
        );
      }
    }

    await updateStudentSecuritySettings(supabaseUrl, student.id, {
      totp_secret: null,
      totp_pending_secret: null,
      totp_enabled: false,
      totp_confirmed_at: null,
      totp_last_used_at: null,
      totp_last_used_counter: null,
    });

    await replaceStudentBackupCodes(supabaseUrl, student.id, []);
    await logStudentSecurityEvent(supabaseUrl, student.id, "totp_disabled", {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to disable TOTP." },
      { status: 500 },
    );
  }
}
