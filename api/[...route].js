import adminRequests from "./_lib/routes/admin/requests.js";
import authAvailability from "./_lib/routes/auth/availability.js";
import authLogin from "./_lib/routes/auth/login.js";
import authLogout from "./_lib/routes/auth/logout.js";
import authMe from "./_lib/routes/auth/me.js";
import authPassword from "./_lib/routes/auth/password.js";
import authRecover from "./_lib/routes/auth/recover.js";
import authSignup from "./_lib/routes/auth/signup.js";
import lists from "./_lib/routes/lists.js";
import movies from "./_lib/routes/movies.js";
import tmdb from "./_lib/routes/tmdb.js";
import upcoming from "./_lib/routes/upcoming.js";

const routes = new Map([
  ["admin/requests", adminRequests],
  ["auth/availability", authAvailability],
  ["auth/login", authLogin],
  ["auth/logout", authLogout],
  ["auth/me", authMe],
  ["auth/password", authPassword],
  ["auth/recover", authRecover],
  ["auth/signup", authSignup],
  ["lists", lists],
  ["movies", movies],
  ["tmdb", tmdb],
  ["upcoming", upcoming],
]);

export default function dispatch(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const route = pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const handler = routes.get(route);
  if (!handler) return response.status(404).json({ error: "API route not found." });
  return handler(request, response);
}