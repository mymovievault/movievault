import { getMovieFile, saveMovieFile } from "./_lib/github.js";
import { readSession } from "./_lib/session.js";

function headers(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

export default async function movies(request, response) {
  headers(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    if (request.method === "GET") return response.status(200).json((await getMovieFile()).records);
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    const session = readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in with GitHub to save changes" });
    const current = await getMovieFile();
    const record = { ...request.body, tmdbId: request.body.tmdbId || Date.now() };
    const records = [record, ...current.records];
    await saveMovieFile(records, current.sha, `Add ${record.title} to Movie Vault`, session.accessToken);
    return response.status(201).json(record);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
