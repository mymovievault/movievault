import { movieCard } from "../components/movie-card.js";
import { searchBox } from "../components/search.js";
import { filterBar } from "../components/filters.js";

export function libraryPage(library, status, title) {
  const entries = library.all().filter((entry) => entry.status === status);
  return `<main><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>${title}</h1><p>${entries.length} title${entries.length === 1 ? "" : "s"} in this shelf.</p>${status === "watched" ? `${searchBox()}${filterBar()}` : ""}</section><section class="movie-grid movie-grid-large">${entries.length ? entries.map((entry) => movieCard(entry).replace("<article class=\"movie-card\">", `<article data-tags="${entry.tags?.join(",") || ""}" class="movie-card">`)).join("") : `<div class="empty-state">Nothing here yet.</div>`}</section></main>`;
}
