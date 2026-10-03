import { deleteUserSessions, findUser, recordAudit, updateUserPassword } from "../_lib/database.js";
import { hashPassword, verifyPassword } from "../_lib/passwords.js";
import { readSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

export default async function password(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "password", 5, 15 * 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many password changes. Try again later.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to change your password." });
    const currentPassword = String(request.body?.currentPassword || "");
    const newPassword = String(request.body?.newPassword || "");
    const user = await findUser(session.username);
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) return response.status(401).json({ error: "Current password is incorrect." });
    if (newPassword.length < 8) return response.status(400).json({ error: "New password must be at least 8 characters." });
    await updateUserPassword(user.id, await hashPassword(newPassword));
    await deleteUserSessions(user.id);
    await recordAudit(user.username, "password_changed", "user", user.id);
    return response.status(200).json({ changed: true });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}