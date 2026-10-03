import crypto from "node:crypto";
import { createUser, findUser, reopenUser } from "../_lib/database.js";
import { hashPassword } from "../_lib/passwords.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

export default async function signup(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "signup", 5, 15 * 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many account requests. Try again later.", retryAfter });
  try {
    const username = String(request.body?.username || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return response.status(400).json({ error: "Use 3-24 letters, numbers, or underscores for your username." });
    if (password.length < 8) return response.status(400).json({ error: "Password must be at least 8 characters." });
    const passwordHash = await hashPassword(password);
    const existing = await findUser(username);
    if (existing && existing.status !== "rejected") return response.status(409).json({ error: "That username is already taken." });
    const user = existing ? await reopenUser(existing.id, passwordHash) : await createUser(crypto.randomUUID(), username, passwordHash);
    return response.status(202).json({ pending: true, login: user.username, message: existing ? "Your request was resubmitted for admin approval." : "Your account request was sent for admin approval." });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
