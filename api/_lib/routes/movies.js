import { addWatchlistItem, areApprovedUsernames, deleteMovie, listMovies, recordAudit, updateMovie, upsertMovie } from "../database.js";
import { readSession } from "../session.js";
import { rateLimit } from "../rate-limit.js";
import { validWatchedWith } from "../watched-with.js";

function headers(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

export default async function movies(request, response) {
  headers(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "movies", 120, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many movie requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Create an account or sign in to view your vault." });
    if (request.method === "GET") return response.status(200).json(await listMovies(session.username));
    if (request.method === "PATCH") {
      const changes = { ...(request.body?.changes || {}) };
      if (Object.hasOwn(changes, "watchedWith")) {
        if (!validWatchedWith(changes.watchedWith) || !(await areApprovedUsernames(changes.watchedWith, session.username))) {
          return response.status(400).json({ error: "Choose only approved users for Watched with." });
        }
      }
      if (changes.status && changes.status !== "watched") changes.watchedWith = [];
      const updated = await updateMovie(request.body?.tmdbId, changes, session.username);
      if (updated) await recordAudit(session.username, "movie_updated", "movie", String(request.body?.tmdbId));
      return updated ? response.status(200).json(updated) : response.status(404).json({ error: "Movie not found." });
    }
    if (request.method === "DELETE") {
      const deleted = await deleteMovie(request.body?.tmdbId, session.username);
      if (deleted) await recordAudit(session.username, "movie_deleted", "movie", String(request.body?.tmdbId));
      return deleted ? response.status(200).json(deleted) : response.status(404).json({ error: "Movie not found." });
    }
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    if (!request.body?.title || typeof request.body.title !== "string") return response.status(400).json({ error: "A movie title is required" });
    const submittedWatchedWith = request.body.watchedWith ?? [];
    if (!validWatchedWith(submittedWatchedWith) || !(await areApprovedUsernames(submittedWatchedWith, session.username))) {
      return response.status(400).json({ error: "Choose only approved users for Watched with." });
    }
    const record = { ...request.body, watchedWith: request.body.status === "watched" ? submittedWatchedWith : [], tmdbId: request.body.tmdbId || Date.now() };
    if (request.body.listId) {
      const added = await addWatchlistItem(session.username, request.body.listId, record);
      if (!added) return response.status(404).json({ error: "Watchlist not found or not owned by you." });
    }
    await upsertMovie(record, session.username);
    await recordAudit(session.username, "movie_saved", "movie", String(record.tmdbId));
    return response.status(201).json(record);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
