import crypto from "node:crypto";

type TwoFactorMethod = "totp" | "email";

type LoginChallengePayload = {
  actorType: "student" | "instructor";
  actorId: string;
  authUserId?: string;
  email: string;
  fullName: string;
  rememberMe?: boolean;
  methods: TwoFactorMethod[];
  emailCodeHash?: string | null;
  emailCodeExpiresAt?: number | null;
  exp: number;
};

const CHALLENGE_SECRET =
  process.env.LOGIN_2FA_SECRET ??
  process.env.STUDENT_SECURITY_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "devatlas-login-2fa-secret";

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(value: string) {
  return toBase64Url(crypto.createHmac("sha256", CHALLENGE_SECRET).update(value).digest());
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function timingSafeStringEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function getStudentLoginChallengeCookieName() {
  return "devatlas_student_login_challenge";
}

export function getInstructorLoginChallengeCookieName() {
  return "devatlas_instructor_login_challenge";
}

export function createLoginChallengeToken(input: Omit<LoginChallengePayload, "exp"> & { ttlSeconds?: number }) {
  const payload: LoginChallengePayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 60 * 10),
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyLoginChallengeToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  if (!timingSafeStringEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as LoginChallengePayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.actorId || !payload.email || !payload.fullName || !Array.isArray(payload.methods)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function generateLoginEmailCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashLoginEmailCode(email: string, code: string) {
  const pepper = process.env.LOGIN_2FA_EMAIL_CODE_PEPPER ?? "devatlas-login-2fa-email-code";
  return crypto.createHash("sha256").update(`${normalizeEmail(email)}:${code.trim()}:${pepper}`).digest("hex");
}

export function verifyLoginEmailCode(email: string, code: string, hash: string) {
  const computed = hashLoginEmailCode(email, code);
  return timingSafeStringEqual(computed, hash);
}

export function maskEmail(email: string) {
  const [localPart, domain] = normalizeEmail(email).split("@");
  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(2, localPart.length - 2))}@${domain}`;
}

export type { TwoFactorMethod, LoginChallengePayload };
