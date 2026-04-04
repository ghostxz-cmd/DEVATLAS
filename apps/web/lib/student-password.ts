import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashStudentPassword(password: string): string {
  const normalizedPassword = password.normalize("NFKC");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(normalizedPassword, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyStudentPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, stored] = parts;
  const computed = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN).toString("hex");

  const storedBuffer = Buffer.from(stored, "hex");
  const computedBuffer = Buffer.from(computed, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}
