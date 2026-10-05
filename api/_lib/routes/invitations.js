import { listWatchedInvitations, recordAudit, respondToWatchedInvitation } from "../database.js";
import { readSession } from "../session.js";
import { setCors } from "../cors.js";
import { rateLimit } from "../rate-limit.js";

export default async function invitations(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET" && request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const retryAfter = rateLimit(request, "invitations", 60, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many invitation requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to view invitations." });
    if (request.method === "GET") return response.status(200).json(await listWatchedInvitations(session.username));
    const { id, action } = request.body || {};
    if (typeof id !== "string" || id.length > 100 || !["accept", "decline"].includes(action)) return response.status(400).json({ error: "Choose an invitation and action." });
    const handled = await respondToWatchedInvitation(session.username, id, action);
    if (!handled) return response.status(404).json({ error: "Invitation is no longer pending." });
    await recordAudit(session.username, `watched_invitation_${action}`, "invitation", id);
    return response.status(200).json({ status: action === "accept" ? "accepted" : "declined" });
  } catch {
    return response.status(500).json({ error: "Could not process invitation." });
  }
}