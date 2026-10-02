import { setCors } from "./_lib/cors.js";

export default async function tmdb(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  try {
    const path = String(request.query?.path || "");
    if (!/^\/(search|movie|tv|discover|genre|trending)\//.test(path)) return response.status(400).json({ error: "Unsupported TMDB path" });
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) return response.status(503).json({ error: "TMDB is not configured." });
    const upstream = await fetch(`https://api.themoviedb.org/3${path}`, { headers: { Authorization: `Bearer ${token}`, accept: "application/json" } });
    const body = await upstream.json();
    return response.status(upstream.status).json(body);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
