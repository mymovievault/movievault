import { readSession } from "../_lib/session.js";
import { setCors } from "../_lib/cors.js";

export default async function me(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const session = readSession(request);
  const user = await session;
  response.status(200).json(user ? { authenticated: true, login: user.username } : { authenticated: false });
}
