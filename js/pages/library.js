import { movieCard } from "../components/movie-card.js";
import { searchBox } from "../components/search.js";
import { filterBar } from "../components/filters.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function libraryPage(library, status, title) {
  const pageSize = 24;
  const statuses = Array.isArray(status) ? status : [status];
  const entries = library.all().filter((entry) => statuses.includes(entry.status));
  const actions = statuses.length === 1 && statuses[0] === "wishlist";
  const genres = [...new Set(entries.flatMap((entry) => entry.genres || []))].sort();
  const filterControls = statuses.includes("watched") ? `<div class="library-filters"><label>Type<select data-library-type><option value="all">All types</option><option value="movie">Movies</option><option value="tv">Series</option><option value="anime">Anime</option></select></label><label>Genre<select data-library-genre><option value="all">All genres</option>${genres.map((genre) => `<option value="${escapeAttr(genre)}">${escapeHtml(genre)}</option>`).join("")}</select></label></div>` : "";
  const cards = entries.map((entry, index) => {
    const isAnime = entry.tags?.some((tag) => tag.toLowerCase() === "anime") || entry.genres?.includes("Animation");
    const card = movieCard(entry).replace("<article class=\"movie-card\">", `<article data-tags="${escapeAttr(entry.tags?.join(",") || "")}" data-media-type="${escapeAttr(entry.mediaType || "")}" data-genres="${escapeAttr(entry.genres?.join(",") || "")}" data-anime="${isAnime}" class="movie-card">`);
    const rendered = actions ? card.replace("</article>", `<div class="library-actions"><button class="button button-primary" data-movie-action="watched" data-movie-id="${entry.tmdbId}">Mark watched</button><button class="button button-quiet" data-movie-action="delete" data-movie-id="${entry.tmdbId}">Remove</button></div></article>`) : card;
    return index >= pageSize ? rendered.replace("<article ", "<article hidden data-paged-card ") : rendered;
  }).join("");
  return `<main class="library-page"><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>${title}</h1><p>${entries.length} title${entries.length === 1 ? "" : "s"} in this shelf.</p>${statuses.includes("watched") ? `${searchBox()}${filterBar()}${filterControls}<p class="library-result-count" data-library-count>Showing ${Math.min(entries.length, pageSize)} of ${entries.length} titles</p>` : ""}<p class="mutation-status" data-mutation-status>Ready.</p></section><section class="movie-grid movie-grid-large">${entries.length ? cards : `<div class="empty-state">Nothing here yet.</div>`}</section>${entries.length > pageSize ? `<button class="button button-quiet" data-library-more>Load more titles</button>` : ""}</main>`;
}
