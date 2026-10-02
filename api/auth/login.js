import { findUser } from "../_lib/database.js";
import { verifyPassword } from "../_lib/passwords.js";
import { createSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

export default async function login(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "login", 10, 15 * 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many login attempts. Try again later.", retryAfter });
  try {
    const username = String(request.body?.username || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const user = await findUser(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) return response.status(401).json({ error: "Invalid username or password." });
    if (user.status !== "approved") return response.status(403).json({ error: "Your account is waiting for admin approval." });
    response.setHeader("Set-Cookie", await createSession(user.id));
    return response.status(200).json({ authenticated: true, login: user.username });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
