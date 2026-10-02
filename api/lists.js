import { addWatchlistItem, createWatchlist, deleteWatchlistItem, listWatchlistItems, listWatchlists, revokeWatchlistShare, shareWatchlist, updateWatchlistItem } from "./_lib/database.js";
import { readSession } from "./_lib/session.js";
import { setCors } from "./_lib/cors.js";

export default async function lists(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to manage watchlists." });
    if (request.method === "GET") {
      if (request.query?.listId) return response.status(200).json(await listWatchlistItems(session.username, request.query.listId));
      return response.status(200).json(await listWatchlists(session.username));
    }
    if (request.method === "POST") {
      if (request.body?.action === "add-item") {
        const added = await addWatchlistItem(session.username, request.body.listId, request.body.record);
        return added ? response.status(201).json(added) : response.status(404).json({ error: "Watchlist not found or not owned by you." });
      }
      if (request.body?.action === "share") {
        const shared = await shareWatchlist(session.username, request.body.listId, String(request.body.username || "").trim().toLowerCase());
        return shared ? response.status(201).json(shared) : response.status(404).json({ error: "Watchlist not found or not owned by you." });
      }
      const name = String(request.body?.name || "").trim();
      if (!name || name.length > 60) return response.status(400).json({ error: "Watchlist name must be 1-60 characters." });
      return response.status(201).json(await createWatchlist(session.username, name));
    }
    if (request.method === "PATCH") {
      const updated = await updateWatchlistItem(session.username, request.body?.listId, request.body?.tmdbId, request.body?.changes || {});
      return updated ? response.status(200).json(updated) : response.status(404).json({ error: "Watchlist item not found or not owned by you." });
    }
    if (request.method === "DELETE") {
      if (request.body?.action === "revoke") {
        const revoked = await revokeWatchlistShare(session.username, request.body.listId, String(request.body.username || "").trim().toLowerCase());
        return revoked ? response.status(200).json(revoked) : response.status(404).json({ error: "Share not found or not owned by you." });
      }
      const deleted = await deleteWatchlistItem(session.username, request.body?.listId, request.body?.tmdbId);
      return deleted ? response.status(200).json(deleted) : response.status(404).json({ error: "Watchlist item not found or not owned by you." });
    }
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
