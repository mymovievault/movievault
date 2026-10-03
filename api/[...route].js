import lists from "./_lib/routes/lists.js";
import movies from "./_lib/routes/movies.js";
import tmdb from "./_lib/routes/tmdb.js";
import upcoming from "./_lib/routes/upcoming.js";
import { routeKey } from "./_lib/route-key.js";

const routes = new Map([
  ["lists", lists],
  ["movies", movies],
  ["tmdb", tmdb],
  ["upcoming", upcoming],
]);

export default function dispatch(request, response) {
  const handler = routes.get(routeKey(request, "/api/"));
  if (!handler) return response.status(404).json({ error: "API route not found." });
  return handler(request, response);
}