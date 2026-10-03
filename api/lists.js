import { addWatchlistItem, createWatchlist, deleteWatchlist, deleteWatchlistItem, listApprovedUsernames, listWatchlistItems, listWatchlists, recordAudit, revokeWatchlistShare, shareWatchlist, updateWatchlistItem } from "./_lib/database.js";
import { readSession } from "./_lib/session.js";
import { setCors } from "./_lib/cors.js";
import { rateLimit } from "./_lib/rate-limit.js";

export default async function lists(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  const retryAfter = rateLimit(request, "lists", 120, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Too many watchlist requests. Try again shortly.", retryAfter });
  try {
    const session = await readSession(request);
    if (!session) return response.status(401).json({ error: "Sign in to manage watchlists." });
    if (request.method === "GET") {
      if (request.query?.action === "approved-users") {
        response.setHeader("Cache-Control", "no-store");
        return response.status(200).json(await listApprovedUsernames(session.username));
      }
      if (request.query?.listId) return response.status(200).json(await listWatchlistItems(session.username, request.query.listId));
      return response.status(200).json(await listWatchlists(session.username));
    }
    if (request.method === "POST") {
      if (request.body?.action === "add-item") {
        const added = await addWatchlistItem(session.username, request.body.listId, request.body.record);
        if (added) await recordAudit(session.username, "watchlist_item_added", "watchlist", request.body.listId);
        return added ? response.status(201).json(added) : response.status(404).json({ error: "Watchlist not found or not owned by you." });
      }
      if (request.body?.action === "share") {
        const shared = await shareWatchlist(session.username, request.body.listId, String(request.body.username || "").trim().toLowerCase());
        if (shared) await recordAudit(session.username, "watchlist_shared", "watchlist", request.body.listId, { viewer: shared.viewer_username });
        return shared ? response.status(201).json(shared) : response.status(404).json({ error: "Watchlist not found or not owned by you." });
      }
      const name = String(request.body?.name || "").trim();
      if (!name || name.length > 60) return response.status(400).json({ error: "Watchlist name must be 1-60 characters." });
      const created = await createWatchlist(session.username, name);
      await recordAudit(session.username, "watchlist_created", "watchlist", created.id);
      return response.status(201).json(created);
    }
    if (request.method === "PATCH") {
      const updated = await updateWatchlistItem(session.username, request.body?.listId, request.body?.tmdbId, request.body?.changes || {});
      if (updated) await recordAudit(session.username, "watchlist_item_updated", "watchlist", request.body?.listId);
      return updated ? response.status(200).json(updated) : response.status(404).json({ error: "Watchlist item not found or not owned by you." });
    }
    if (request.method === "DELETE") {
      if (request.body?.action === "delete-list") {
        const deletedList = await deleteWatchlist(session.username, request.body.listId);
        if (deletedList) await recordAudit(session.username, "watchlist_deleted", "watchlist", deletedList.id);
        return deletedList ? response.status(200).json(deletedList) : response.status(404).json({ error: "Only owned custom watchlists can be deleted." });
      }
      if (request.body?.action === "revoke") {
        const revoked = await revokeWatchlistShare(session.username, request.body.listId, String(request.body.username || "").trim().toLowerCase());
        if (revoked) await recordAudit(session.username, "watchlist_share_revoked", "watchlist", request.body.listId, { viewer: revoked.viewer_username });
        return revoked ? response.status(200).json(revoked) : response.status(404).json({ error: "Share not found or not owned by you." });
      }
      const deleted = await deleteWatchlistItem(session.username, request.body?.listId, request.body?.tmdbId);
      if (deleted) await recordAudit(session.username, "watchlist_item_deleted", "watchlist", request.body?.listId);
      return deleted ? response.status(200).json(deleted) : response.status(404).json({ error: "Watchlist item not found or not owned by you." });
    }
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
