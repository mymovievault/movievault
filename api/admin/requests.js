import { listPendingUsers, updateUserStatus } from "../_lib/database.js";
import { readSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";

export default async function requests(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const session = await readSession(request);
    if (!session || session.role !== "admin") return response.status(403).json({ error: "Admin access required." });
    if (request.method === "GET") return response.status(200).json(await listPendingUsers());
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    const userId = String(request.body?.userId || "");
    const status = request.body?.status;
    if (!userId || !["approved", "rejected"].includes(status)) return response.status(400).json({ error: "Choose approved or rejected." });
    const user = await updateUserStatus(userId, status);
    return user ? response.status(200).json(user) : response.status(404).json({ error: "User request not found." });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
