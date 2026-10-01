import crypto from "node:crypto";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(value) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("base64url");
}

export function createSession(user) {
  const payload = encode({ ...user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return `${payload}.${signature(payload)}`;
}

export function readSession(request) {
  const cookies = Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => part.trim().split("=")));
  const value = cookies.movie_vault_session;
  if (!value) return null;
  const [payload, signedValue] = value.split(".");
  const expectedSignature = Buffer.from(signature(payload || ""));
  const receivedSignature = Buffer.from(signedValue || "");
  if (!payload || expectedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(expectedSignature, receivedSignature)) return null;
  const session = JSON.parse(Buffer.from(payload, "base64url").toString());
  return session.expiresAt > Date.now() ? session : null;
}

export function sessionCookie(value, maxAge = 7 * 24 * 60 * 60) {
  return `movie_vault_session=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
