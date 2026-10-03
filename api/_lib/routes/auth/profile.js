import { getUserProfile, recordAudit, updateUserProfile } from "../../database.js";
import { readSession } from "../../session.js";
import { setCors } from "../../cors.js";
import { rateLimit } from "../../rate-limit.js";
import { validateProfile } from "../../profile.js";

export default async function profile(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET" && request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const retryAfter = rateLimit(request, "profile", 30, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many profile requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to view your profile." });
    if (request.method === "GET") {
      const user = await getUserProfile(session.username);
      return user ? response.status(200).json(user) : response.status(404).json({ error: "Profile not found." });
    }

    const result = validateProfile(request.body);
    if (result.error) return response.status(400).json({ error: result.error });
    const user = await updateUserProfile(session.username, result.profile);
    if (!user) return response.status(404).json({ error: "Profile not found." });
    await recordAudit(session.username, "profile_updated", "user", session.id);
    return response.status(200).json(user);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}