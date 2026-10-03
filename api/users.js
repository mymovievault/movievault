import { listApprovedUsernames } from "./_lib/database.js";
import { readSession } from "./_lib/session.js";
import { rateLimit } from "./_lib/rate-limit.js";

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
}

export default async function users(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  const retryAfter = rateLimit(request, "approved-users", 30, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to view approved users." });
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(await listApprovedUsernames(session.username));
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}