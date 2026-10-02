import { addWatchlistItem, deleteMovie, listMovies, updateMovie, upsertMovie } from "./_lib/database.js";
import { readSession } from "./_lib/session.js";

function headers(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

export default async function movies(request, response) {
  headers(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Create an account or sign in to view your vault." });
    if (request.method === "GET") return response.status(200).json(await listMovies(session.username));
    if (request.method === "PATCH") {
      const updated = await updateMovie(request.body?.tmdbId, request.body?.changes || {}, session.username);
      return updated ? response.status(200).json(updated) : response.status(404).json({ error: "Movie not found." });
    }
    if (request.method === "DELETE") {
      const deleted = await deleteMovie(request.body?.tmdbId, session.username);
      return deleted ? response.status(200).json(deleted) : response.status(404).json({ error: "Movie not found." });
    }
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    if (!request.body?.title || typeof request.body.title !== "string") return response.status(400).json({ error: "A movie title is required" });
    const record = { ...request.body, tmdbId: request.body.tmdbId || Date.now() };
    if (request.body.listId) {
      const added = await addWatchlistItem(session.username, request.body.listId, record);
      if (!added) return response.status(404).json({ error: "Watchlist not found or not owned by you." });
    }
    await upsertMovie(record, session.username);
    return response.status(201).json(record);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
