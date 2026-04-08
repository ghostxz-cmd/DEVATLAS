import crypto from "node:crypto";

type StudentSessionPayload = {
  studentId: string;
  email: string;
  fullName: string;
  exp: number;
};

type StudentLoginChallengePayload = {
  studentId: string;
  exp: number;
  purpose: "student-login-2fa";
};

const SESSION_COOKIE = "devatlas_student_session";
const LOGIN_CHALLENGE_COOKIE = "devatlas_student_login_challenge";

function getSessionSecret() {
  return process.env.STUDENT_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "devatlas-student-session-secret";
}

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
  return toBase64Url(crypto.createHmac("sha256", getSessionSecret()).update(value).digest());
}

function verifySignedPayload<T extends { exp?: number }>(payloadEncoded: string, signature: string) {
  const expectedSignature = sign(payloadEncoded);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as T;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getStudentSessionCookieName() {
  return SESSION_COOKIE;
}

export function getStudentLoginChallengeCookieName() {
  return LOGIN_CHALLENGE_COOKIE;
}

export function createStudentSessionToken(input: { studentId: string; email: string; fullName: string; ttlSeconds?: number }) {
  const payload: StudentSessionPayload = {
    studentId: input.studentId,
    email: input.email,
    fullName: input.fullName,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 60 * 60 * 24 * 7),
  };

  const payloadRaw = JSON.stringify(payload);
  const payloadEncoded = toBase64Url(payloadRaw);
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyStudentSessionToken(token: string | undefined | null): StudentSessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const payload = verifySignedPayload<StudentSessionPayload>(payloadEncoded, signature);
  if (!payload || !payload.studentId || !payload.email || !payload.fullName) {
    return null;
  }

  return payload;
}

export function createStudentLoginChallengeToken(input: { studentId: string; ttlSeconds?: number }) {
  const payload: StudentLoginChallengePayload = {
    studentId: input.studentId,
    purpose: "student-login-2fa",
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 60 * 10),
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyStudentLoginChallengeToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const payload = verifySignedPayload<StudentLoginChallengePayload>(payloadEncoded, signature);
  if (!payload || payload.purpose !== "student-login-2fa" || !payload.studentId) {
    return null;
  }

  return payload;
}
