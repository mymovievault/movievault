import crypto from "node:crypto";
import { createUser, findUser } from "../_lib/database.js";
import { hashPassword } from "../_lib/passwords.js";
import { createSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";

export default async function signup(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const username = String(request.body?.username || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return response.status(400).json({ error: "Use 3-24 letters, numbers, or underscores for your username." });
    if (password.length < 8) return response.status(400).json({ error: "Password must be at least 8 characters." });
    if (await findUser(username)) return response.status(409).json({ error: "That username is already taken." });
    const user = await createUser(crypto.randomUUID(), username, await hashPassword(password));
    response.setHeader("Set-Cookie", await createSession(user.id));
    return response.status(201).json({ authenticated: true, login: user.username });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
