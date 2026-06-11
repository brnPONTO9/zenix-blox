import { createHmac, randomBytes } from "node:crypto";

function getIdentitySecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must have at least 32 characters.");
  }

  return secret;
}

export function createDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function isValidDeviceToken(token: string | undefined) {
  return Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));
}

export function hashIdentity(value: string) {
  return createHmac("sha256", getIdentitySecret()).update(value).digest("hex");
}

export function getClientIp(headers: Headers) {
  const forwarded =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0];

  const value = forwarded?.trim();
  return value ? value.replace(/^::ffff:/, "") : null;
}
