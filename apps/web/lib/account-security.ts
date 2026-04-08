import crypto from "node:crypto";

const PIN_HASH_PREFIX = "scrypt";
const BACKUP_CODE_PEPPER = process.env.STUDENT_SECURITY_BACKUP_CODE_PEPPER ?? "devatlas-student-security-backup";
const SECURITY_UNLOCK_COOKIE = "devatlas_student_security_unlock";
const SECURITY_UNLOCK_SECRET = process.env.STUDENT_SECURITY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "devatlas-student-security-secret";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

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

function base32Encode(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(value: string) {
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error("Invalid TOTP secret encoding.");
    }

    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function counterBuffer(counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

function generateHotp(secret: Buffer, counter: number, digits = 6) {
  const hmac = crypto.createHmac("sha1", secret).update(counterBuffer(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

function timingSafeStringEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function getSecurityUnlockCookieName() {
  return SECURITY_UNLOCK_COOKIE;
}

export function generateTotpSecret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength));
}

export function buildTotpOtpAuthUrl(input: { issuer: string; accountName: string; secret: string }) {
  const issuer = encodeURIComponent(input.issuer);
  const accountName = encodeURIComponent(input.accountName);
  const secret = encodeURIComponent(input.secret.replace(/\s+/g, "").toUpperCase());
  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotpCode(secret: string, timestamp = Date.now(), periodSeconds = 30, digits = 6) {
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / periodSeconds);
  return generateHotp(secretBuffer, counter, digits);
}

export function verifyTotpCode(input: { secret: string; code: string; timestamp?: number; window?: number; periodSeconds?: number; digits?: number }) {
  const code = input.code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const window = input.window ?? 1;
  const timestamp = input.timestamp ?? Date.now();
  const periodSeconds = input.periodSeconds ?? 30;
  const digits = input.digits ?? 6;
  const secretBuffer = base32Decode(input.secret);
  const counter = Math.floor(timestamp / 1000 / periodSeconds);

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateHotp(secretBuffer, counter + offset, digits);
    if (timingSafeStringEqual(expected, code)) {
      return true;
    }
  }

  return false;
}

export function hashSecurityPin(pin: string) {
  const normalized = pin.trim().replace(/\s+/g, "");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `${PIN_HASH_PREFIX}:${salt}:${hash}`;
}

export function verifySecurityPin(pin: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== PIN_HASH_PREFIX) {
    return false;
  }

  const [, salt, stored] = parts;
  const computed = crypto.scryptSync(pin.trim().replace(/\s+/g, ""), salt, 64).toString("hex");

  const storedBuffer = Buffer.from(stored, "hex");
  const computedBuffer = Buffer.from(computed, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

export function generateBackupCodes(count = 8, length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes = Array.from({ length: count }, () => {
    let code = "";
    for (let index = 0; index < length; index += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    return code;
  });

  return codes;
}

export function hashBackupCode(code: string) {
  return crypto.createHash("sha256").update(`${code.trim().toUpperCase()}:${BACKUP_CODE_PEPPER}`).digest("hex");
}

export function verifyBackupCode(code: string, storedHash: string) {
  const computed = hashBackupCode(code);
  return timingSafeStringEqual(computed, storedHash);
}

export function createSecurityUnlockToken(input: { studentId: string; ttlSeconds?: number }) {
  const payload = {
    studentId: input.studentId,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 60 * 10),
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", SECURITY_UNLOCK_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySecurityUnlockToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", SECURITY_UNLOCK_SECRET).update(encoded).digest("base64url");
  if (!timingSafeStringEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as { studentId?: string; exp?: number };
    if (!payload.studentId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
