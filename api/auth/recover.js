import crypto from "node:crypto";
import { consumePasswordResetToken, deleteUserSessions, getUserById, recordAudit, updateUserPassword } from "../_lib/database.js";
import { hashPassword } from "../_lib/passwords.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function recover(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "recover", 5, 15 * 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many recovery attempts. Try again later.", retryAfter });
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  try {
    const resetToken = String(request.body?.resetToken || "").trim();
    const newPassword = String(request.body?.newPassword || "");
    if (!/^[a-f0-9]{64}$/.test(resetToken)) return response.status(400).json({ error: "Enter the recovery token provided by an administrator." });
    if (newPassword.length < 8) return response.status(400).json({ error: "New password must be at least 8 characters." });
    const userId = await consumePasswordResetToken(tokenHash(resetToken));
    if (!userId) return response.status(400).json({ error: "That recovery token is invalid or expired. Ask an administrator for a new token." });
    await updateUserPassword(userId, await hashPassword(newPassword));
    await deleteUserSessions(userId);
    const user = await getUserById(userId);
    await recordAudit(user?.username || "admin", "password_recovered", "user", userId);
    return response.status(200).json({ reset: true, message: "Password reset. You can sign in now." });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}