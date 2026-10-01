import { listMovies, upsertMovie } from "./_lib/database.js";
import { readSession } from "./_lib/session.js";

function headers(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

export default async function movies(request, response) {
  headers(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Create an account or sign in to view your vault." });
    if (request.method === "GET") return response.status(200).json(await listMovies(session.username));
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    if (!request.body?.title || typeof request.body.title !== "string") return response.status(400).json({ error: "A movie title is required" });
    const record = { ...request.body, tmdbId: request.body.tmdbId || Date.now() };
    await upsertMovie(record, session.username);
    return response.status(201).json(record);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
