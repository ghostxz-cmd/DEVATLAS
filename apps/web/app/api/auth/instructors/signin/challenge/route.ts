import { NextResponse } from "next/server";
import {
  createLoginChallengeToken,
  generateLoginEmailCode,
  getInstructorLoginChallengeCookieName,
  hashLoginEmailCode,
  maskEmail,
  type TwoFactorMethod,
} from "@/lib/login-2fa";
import { ensureInstructorSecuritySettings } from "@/lib/instructor-security-store";
import { generateLoginTwoFactorEmail } from "@/lib/email-templates";

type AuthUserResponse = {
  id: string;
  email: string | null;
  user_metadata?: {
    role?: string;
  };
};

type InstructorAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  status: string;
};

type InstructorSecurityRow = {
  totp_enabled: boolean;
  totp_secret: string | null;
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

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toUpperCase();
}

function getEmailCodeExpiryMinutes() {
  return 10;
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

async function getAuthedInstructor(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      ...getSupabaseHeaders(),
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) {
    return null;
  }

  const authedUser = (await userResponse.json()) as AuthUserResponse;
  if (normalizeRole(authedUser.user_metadata?.role) !== "INSTRUCTOR") {
    return null;
  }

  const accountResponse = await fetch(
    `${supabaseUrl}/rest/v1/instructor_accounts?select=id,auth_user_id,email,full_name,status&auth_user_id=eq.${encodeURIComponent(authedUser.id)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!accountResponse.ok) {
    throw new Error(await accountResponse.text());
  }

  const accounts = (await accountResponse.json()) as InstructorAccountRow[];
  const account = accounts[0] ?? null;
  if (!account || account.status !== "ACTIVE") {
    return null;
  }

  return { supabaseUrl, authedUser, account };
}

export async function POST(request: Request) {
  try {
    const context = await getAuthedInstructor(request);
    if (!context) {
      return NextResponse.json({ message: "Missing valid instructor session." }, { status: 401 });
    }

    const security = (await ensureInstructorSecuritySettings(
      context.supabaseUrl,
      context.authedUser.id,
      context.account.id,
      "INSTRUCTOR",
    )) as InstructorSecurityRow;

    const hasTotp = Boolean(security.totp_enabled && security.totp_secret);
    const methods: TwoFactorMethod[] = hasTotp ? ["totp", "email"] : ["email"];
    const preferredMethod: TwoFactorMethod = hasTotp ? "totp" : "email";

    let emailCodeHash: string | null = null;
    let emailCodeExpiresAt: number | null = null;

    if (preferredMethod === "email") {
      const code = generateLoginEmailCode();
      emailCodeHash = hashLoginEmailCode(context.account.email, code);
      emailCodeExpiresAt = Date.now() + getEmailCodeExpiryMinutes() * 60 * 1000;
      await sendLoginCodeEmail({
        email: context.account.email,
        fullName: context.account.full_name,
        code,
      });
    }

    const challengeToken = createLoginChallengeToken({
      actorType: "instructor",
      actorId: context.account.id,
      authUserId: context.authedUser.id,
      email: context.account.email,
      fullName: context.account.full_name,
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
      maskedEmail: maskEmail(context.account.email),
    });

    response.cookies.set({
      name: getInstructorLoginChallengeCookieName(),
      value: challengeToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create instructor challenge." },
      { status: 500 },
    );
  }
}
