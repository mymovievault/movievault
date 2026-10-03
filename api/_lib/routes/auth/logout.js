import { clearSession, sessionCookie } from "../../session.js";
import { setCors } from "../../cors.js";

export default async function logout(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  await clearSession(request);
  response.setHeader("Set-Cookie", sessionCookie("", 0));
  response.status(204).end();
}
