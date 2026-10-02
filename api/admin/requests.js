import crypto from "node:crypto";
import { findUser, listPendingUsers, listUsers, recordAudit, savePasswordResetToken, updateUserStatus } from "../_lib/database.js";
import { readSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

export default async function requests(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "admin", 120, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many admin requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session || session.role !== "admin") return response.status(403).json({ error: "Admin access required." });
    if (request.method === "GET") return response.status(200).json({ pending: await listPendingUsers(), users: await listUsers() });
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    const userId = String(request.body?.userId || "");
    const status = request.body?.status;
    if (request.body?.action === "issue-reset") {
      const user = await findUser(String(request.body?.username || "").trim().toLowerCase());
      if (!user) return response.status(404).json({ error: "User not found." });
      const token = crypto.randomBytes(32).toString("hex");
      await savePasswordResetToken(crypto.createHash("sha256").update(token).digest("hex"), user.id, new Date(Date.now() + 30 * 60 * 1000));
      await recordAudit(session.username, "password_reset_issued", "user", user.id);
      return response.status(200).json({ username: user.username, resetToken: token, expiresInMinutes: 30 });
    }
    if (!userId || !["approved", "rejected"].includes(status)) return response.status(400).json({ error: "Choose approved or rejected." });
    const user = await updateUserStatus(userId, status);
    if (user) await recordAudit(session.username, `account_${status}`, "user", user.id);
    return user ? response.status(200).json(user) : response.status(404).json({ error: "User request not found." });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
