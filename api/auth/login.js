import { findUser } from "../_lib/database.js";
import { verifyPassword } from "../_lib/passwords.js";
import { createSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";

export default async function login(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const username = String(request.body?.username || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const user = await findUser(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) return response.status(401).json({ error: "Invalid username or password." });
    response.setHeader("Set-Cookie", await createSession(user.id));
    return response.status(200).json({ authenticated: true, login: user.username });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
