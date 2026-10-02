import { movieCard } from "../components/movie-card.js";

export function listsPage(library) {
  const watchlist = library.all().filter((entry) => entry.status === "wishlist");
  return `<main><section class="page-heading"><p class="eyebrow">YOUR COLLECTIONS</p><h1>Watchlists</h1><p>Create private lists and share selected lists as read-only collections.</p><form class="list-create" data-create-list><input name="name" required maxlength="60" placeholder="New watchlist name" /><button class="button button-primary">Create list <span>+</span></button></form></section><section class="watchlist-section"><div class="section-heading"><div><p class="eyebrow">MY LIBRARY</p><h2>Watchlist</h2></div><span class="section-count">${watchlist.length} titles</span></div><div class="movie-grid movie-grid-large">${watchlist.length ? watchlist.map(movieCard).join("") : `<div class="empty-state">Your watchlist is empty.</div>`}</div></section><section class="lists-grid" data-lists></section></main>`;
}

export async function bindLists(root, apiUrl, onListsChanged = () => {}) {
  const container = root.querySelector("[data-lists]");
  const request = async (url, options) => {
    const response = await fetch(url, { credentials: "include", ...options });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not update watchlist.");
    return result;
  };
  const load = async () => {
    const lists = await request(`${apiUrl}/api/lists`);
    onListsChanged(lists);
    container.innerHTML = lists.map((list) => {
      const cards = (list.items || []).map((movie) => {
        const card = movieCard(movie);
        return list.is_owner ? card.replace("</article>", `<div class="library-actions"><button class="button button-quiet" data-remove-item="${list.id}" data-movie-id="${movie.tmdbId}">Remove</button></div></article>`) : card;
      }).join("");
      const sharedWith = list.is_owner && list.shared_with?.length ? `<div class="list-shares"><p class="list-owner">Shared with</p>${list.shared_with.map((username) => `<span>${username}<button type="button" class="text-link" data-revoke-share="${list.id}" data-share-user="${username}">Revoke</button></span>`).join("")}</div>` : "";
      return `<article class="list-panel"><p class="eyebrow">${list.is_owner ? "YOUR LIST" : "SHARED WITH YOU"}</p><h2>${list.name}</h2><p class="list-owner">Owner: ${list.owner_username} / ${(list.items || []).length} title${(list.items || []).length === 1 ? "" : "s"}</p>${list.is_owner ? `<form data-share-list="${list.id}" class="share-form"><input name="username" required placeholder="Username to share with" /><button class="button button-quiet">Share read-only</button></form>${sharedWith}` : ""}<div class="movie-grid list-movie-grid">${cards || `<div class="empty-state">No movies in this list yet.</div>`}</div></article>`;
    }).join("") || `<div class="empty-state">No watchlists yet.</div>`;
    container.querySelectorAll("[data-share-list]").forEach((form) => form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      try { await request(`${apiUrl}/api/lists`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share", listId: form.dataset.shareList, username: data.username }) }); form.reset(); await load(); } catch (error) { window.alert(error.message); }
    }));
    container.querySelectorAll("[data-revoke-share]").forEach((button) => button.addEventListener("click", async () => {
      try { await request(`${apiUrl}/api/lists`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", listId: button.dataset.revokeShare, username: button.dataset.shareUser }) }); await load(); } catch (error) { window.alert(error.message); }
    }));
    container.querySelectorAll("[data-remove-item]").forEach((button) => button.addEventListener("click", async () => {
      try { await request(`${apiUrl}/api/lists`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId: button.dataset.removeItem, tmdbId: button.dataset.movieId }) }); await load(); } catch (error) { window.alert(error.message); }
    }));
  };
  root.querySelector("[data-create-list]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await request(`${apiUrl}/api/lists`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); event.currentTarget.reset(); await load(); } catch (error) { window.alert(error.message); }
  });
  await load();
}
