import crypto from "node:crypto";
import { deleteSession, findSession, saveSession } from "./database.js";

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieToken(request) {
  const cookies = Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => part.trim().split("=")));
  return cookies.movie_vault_session;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await saveSession(tokenHash(token), userId, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  return sessionCookie(token);
}

export async function readSession(request) {
  const token = cookieToken(request);
  return token ? findSession(tokenHash(token)) : null;
}

export async function clearSession(request) {
  const token = cookieToken(request);
  if (token) await deleteSession(tokenHash(token));
}

export function sessionCookie(value, maxAge = 7 * 24 * 60 * 60) {
  return `movie_vault_session=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`;
}
