import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyBackupCode, verifyTotpCode } from "@/lib/account-security";
import {
  createLoginChallengeToken,
  generateLoginEmailCode,
  getInstructorLoginChallengeCookieName,
  hashLoginEmailCode,
  maskEmail,
  verifyLoginChallengeToken,
  verifyLoginEmailCode,
  type TwoFactorMethod,
} from "@/lib/login-2fa";
import {
  ensureInstructorSecuritySettings,
  logInstructorSecurityEvent,
  updateInstructorSecuritySettings,
} from "@/lib/instructor-security-store";
import { generateLoginTwoFactorEmail } from "@/lib/email-templates";

type InstructorSecurityRow = {
  totp_enabled: boolean;
  totp_secret: string | null;
  totp_last_used_counter: number | null;
  backup_codes: Array<{ code_hash: string; used_at: string | null }>;
};

const confirmSchema = z.object({
  intent: z.enum(["verify", "send_email_code"]).optional().default("verify"),
  method: z.enum(["totp", "email"]),
  code: z.string().trim().min(6).max(12).optional(),
  backupCode: z.string().trim().min(6).max(32).optional(),
});

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(getInstructorLoginChallengeCookieName())?.value ?? null;
    const challenge = verifyLoginChallengeToken(challengeToken);

    if (!challenge || challenge.actorType !== "instructor" || !challenge.authUserId) {
      return NextResponse.json({ message: "Missing 2FA challenge." }, { status: 401 });
    }

    const payload = confirmSchema.parse(await request.json());
    if (!challenge.methods.includes(payload.method)) {
      return NextResponse.json({ message: "Metoda selectată nu este disponibilă." }, { status: 400 });
    }

    const security = (await ensureInstructorSecuritySettings(
      supabaseUrl,
      challenge.authUserId,
      challenge.actorId,
      "INSTRUCTOR",
    )) as InstructorSecurityRow;

    if (payload.method === "totp" && (!security.totp_enabled || !security.totp_secret)) {
      return NextResponse.json({ message: "2FA nu este activată pentru acest cont." }, { status: 409 });
    }

    if (payload.intent === "send_email_code") {
      const code = generateLoginEmailCode();
      const emailCodeHash = hashLoginEmailCode(challenge.email, code);
      const emailCodeExpiresAt = Date.now() + getEmailCodeExpiryMinutes() * 60 * 1000;
      const nextChallengeToken = createLoginChallengeToken({
        actorType: "instructor",
        actorId: challenge.actorId,
        authUserId: challenge.authUserId,
        email: challenge.email,
        fullName: challenge.fullName,
        methods: challenge.methods as TwoFactorMethod[],
        emailCodeHash,
        emailCodeExpiresAt,
        ttlSeconds: 60 * 10,
      });

      await sendLoginCodeEmail({
        email: challenge.email,
        fullName: challenge.fullName,
        code,
      });

      const response = NextResponse.json({
        ok: true,
        message: `Am trimis codul la ${maskEmail(challenge.email)}.`,
      });

      response.cookies.set({
        name: getInstructorLoginChallengeCookieName(),
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

    if (payload.method === "totp" && payload.code && security.totp_secret) {
      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      if (security.totp_last_used_counter !== null && security.totp_last_used_counter === currentCounter) {
        return NextResponse.json({ message: "Codul 2FA a fost deja folosit." }, { status: 403 });
      }

      verified = verifyTotpCode({ secret: security.totp_secret, code: payload.code });
    }

    if (payload.method === "totp" && !verified && payload.backupCode) {
      const matchingCode = security.backup_codes.find(
        (row) => !row.used_at && verifyBackupCode(payload.backupCode ?? "", row.code_hash),
      );

      if (matchingCode) {
        const updatedCodes = security.backup_codes.map((row) =>
          row.code_hash === matchingCode.code_hash ? { ...row, used_at: new Date().toISOString() } : row,
        );

        await updateInstructorSecuritySettings(
          supabaseUrl,
          challenge.authUserId,
          challenge.actorId,
          {
            backup_codes: updatedCodes,
          },
          "INSTRUCTOR",
        );

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

      verified = verifyLoginEmailCode(challenge.email, payload.code, challenge.emailCodeHash);
    }

    if (!verified) {
      await logInstructorSecurityEvent(supabaseUrl, challenge.authUserId, challenge.actorId, "login_2fa_failed", {}, "INSTRUCTOR");
      return NextResponse.json({ message: "Codul 2FA este invalid." }, { status: 403 });
    }

    if (payload.method === "totp") {
      await updateInstructorSecuritySettings(
        supabaseUrl,
        challenge.authUserId,
        challenge.actorId,
        {
          totp_last_used_at: new Date().toISOString(),
          totp_last_used_counter: Math.floor(Date.now() / 1000 / 30),
        },
        "INSTRUCTOR",
      );

      await logInstructorSecurityEvent(
        supabaseUrl,
        challenge.authUserId,
        challenge.actorId,
        usedBackupCode ? "totp_backup_code_used" : "totp_login_verified",
        {},
        "INSTRUCTOR",
      );
    } else {
      await logInstructorSecurityEvent(supabaseUrl, challenge.authUserId, challenge.actorId, "email_2fa_login_verified", {}, "INSTRUCTOR");
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "devatlas_instructor_2fa_verified",
      value: "1",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set({
      name: getInstructorLoginChallengeCookieName(),
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
      { message: error instanceof Error ? error.message : "Failed to confirm instructor 2FA." },
      { status: 500 },
    );
  }
}
