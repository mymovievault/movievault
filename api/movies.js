import { getMovieFile, saveMovieFile } from "./_lib/github.js";

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
    if (request.method === "GET") return response.status(200).json((await getMovieFile()).records);
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    if (!request.body?.title || typeof request.body.title !== "string") return response.status(400).json({ error: "A movie title is required" });
    const current = await getMovieFile();
    const record = { ...request.body, tmdbId: request.body.tmdbId || Date.now() };
    const records = [record, ...current.records];
    await saveMovieFile(records, current.sha, `Add ${record.title} to Movie Vault`);
    return response.status(201).json(record);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
