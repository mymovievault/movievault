import { findUser } from "../_lib/database.js";
import { setCors } from "../_lib/cors.js";
import { rateLimit } from "../_lib/rate-limit.js";

export default async function availability(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "availability", 30, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many username checks. Try again later.", retryAfter });
  const username = String(request.query?.username || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return response.status(200).json({ available: false, message: "Use 3-24 letters, numbers, or underscores." });
  const user = await findUser(username);
  if (!user) return response.status(200).json({ available: true, message: "Username is available." });
  if (user.status === "rejected") return response.status(200).json({ available: true, message: "Available to resubmit for approval." });
  return response.status(200).json({ available: false, message: "Username is already in use." });
}
