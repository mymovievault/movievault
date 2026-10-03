import availability from "../_lib/routes/auth/availability.js";
import login from "../_lib/routes/auth/login.js";
import logout from "../_lib/routes/auth/logout.js";
import me from "../_lib/routes/auth/me.js";
import password from "../_lib/routes/auth/password.js";
import profile from "../_lib/routes/auth/profile.js";
import recover from "../_lib/routes/auth/recover.js";
import signup from "../_lib/routes/auth/signup.js";
import { routeKey } from "../_lib/route-key.js";

const routes = new Map([
  ["availability", availability],
  ["login", login],
  ["logout", logout],
  ["me", me],
  ["password", password],
  ["profile", profile],
  ["recover", recover],
  ["signup", signup],
]);

export default function dispatch(request, response) {
  const handler = routes.get(routeKey(request, "/api/auth/"));
  if (!handler) return response.status(404).json({ error: "API route not found." });
  return handler(request, response);
}