import crypto from "node:crypto";

type StudentSessionPayload = {
  studentId: string;
  email: string;
  fullName: string;
  exp: number;
};

const SESSION_COOKIE = "devatlas_student_session";

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

export function getStudentSessionCookieName() {
  return SESSION_COOKIE;
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

  const expectedSignature = sign(payloadEncoded);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as StudentSessionPayload;
    if (!payload.studentId || !payload.email || !payload.fullName || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
