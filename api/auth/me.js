import { readSession } from "../_lib/session.js";

export default function me(request, response) {
  const session = readSession(request);
  response.status(200).json(session ? { authenticated: true, login: session.login } : { authenticated: false });
}
