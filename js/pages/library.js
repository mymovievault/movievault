import { movieCard } from "../components/movie-card.js";
import { searchBox } from "../components/search.js";
import { filterBar } from "../components/filters.js";

export function libraryPage(library, status, title) {
  const statuses = Array.isArray(status) ? status : [status];
  const entries = library.all().filter((entry) => statuses.includes(entry.status));
  const actions = statuses.length === 1 && statuses[0] === "wishlist";
  const genres = [...new Set(entries.flatMap((entry) => entry.genres || []))].sort();
  const filterControls = statuses.includes("watched") ? `<div class="library-filters"><label>Type<select data-library-type><option value="all">All types</option><option value="movie">Movies</option><option value="tv">Series</option><option value="anime">Anime</option></select></label><label>Genre<select data-library-genre><option value="all">All genres</option>${genres.map((genre) => `<option value="${genre}">${genre}</option>`).join("")}</select></label></div>` : "";
  const cards = entries.map((entry) => {
    const isAnime = entry.tags?.some((tag) => tag.toLowerCase() === "anime") || entry.genres?.includes("Animation");
    const card = movieCard(entry).replace("<article class=\"movie-card\">", `<article data-tags="${entry.tags?.join(",") || ""}" data-media-type="${entry.mediaType || ""}" data-genres="${entry.genres?.join(",") || ""}" data-anime="${isAnime}" class="movie-card">`);
    return actions ? card.replace("</article>", `<div class="library-actions"><button class="button button-primary" data-movie-action="watched" data-movie-id="${entry.tmdbId}">Mark watched</button><button class="button button-quiet" data-movie-action="delete" data-movie-id="${entry.tmdbId}">Remove</button></div></article>`) : card;
  }).join("");
  return `<main class="library-page"><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>${title}</h1><p>${entries.length} title${entries.length === 1 ? "" : "s"} in this shelf.</p>${statuses.includes("watched") ? `${searchBox()}${filterBar()}${filterControls}` : ""}</section><section class="movie-grid movie-grid-large">${entries.length ? cards : `<div class="empty-state">Nothing here yet.</div>`}</section></main>`;
}
