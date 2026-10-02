import { movieCard } from "../components/movie-card.js";
import { searchBox } from "../components/search.js";
import { filterBar } from "../components/filters.js";

export function libraryPage(library, status, title) {
  const statuses = Array.isArray(status) ? status : [status];
  const entries = library.all().filter((entry) => statuses.includes(entry.status));
  const actions = statuses.length === 1 && statuses[0] === "wishlist";
  const cards = entries.map((entry) => {
    const card = movieCard(entry).replace("<article class=\"movie-card\">", `<article data-tags="${entry.tags?.join(",") || ""}" class="movie-card">`);
    return actions ? card.replace("</article>", `<div class="library-actions"><button class="button button-primary" data-movie-action="watched" data-movie-id="${entry.tmdbId}">Mark watched</button><button class="button button-quiet" data-movie-action="delete" data-movie-id="${entry.tmdbId}">Remove</button></div></article>`) : card;
  }).join("");
  return `<main><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>${title}</h1><p>${entries.length} title${entries.length === 1 ? "" : "s"} in this shelf.</p>${statuses.includes("watched") ? `${searchBox()}${filterBar()}` : ""}</section><section class="movie-grid movie-grid-large">${entries.length ? cards : `<div class="empty-state">Nothing here yet.</div>`}</section></main>`;
}
