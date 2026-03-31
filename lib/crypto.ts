import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(key, "hex");

  if (derived.length !== original.length) {
    return false;
  }

  return timingSafeEqual(derived, original);
}

export function generateOpaqueToken(length = 32) {
  return randomBytes(length).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
