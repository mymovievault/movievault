import { readSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";

export default async function me(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const user = await readSession(request);
  if (user) return response.status(200).json({ authenticated: true, login: user.username, role: user.role });
  response.setHeader("Set-Cookie", "movie_vault_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None");
  return response.status(401).json({ authenticated: false, sessionExpired: Boolean(request.headers.cookie) });
}
