import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function upcomingCard(movie, watchlists = []) {
  const options = watchlists.filter((list) => list.is_owner).map((list) => `<option value="${escapeAttr(list.id)}">${escapeHtml(list.name)}</option>`).join("");
  return `<article class="movie-card"><a href="#/movie/${escapeAttr(movie.tmdbId)}" class="poster-wrap"><img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" loading="lazy" /><span class="status-pill">${escapeHtml(movie.languageLabel || "curated")}</span></a><div class="movie-meta"><div><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.releaseDate || "Release date TBA")} <span class="dot">•</span> ${escapeHtml(movie.category || movie.genres?.[0] || "Film")}</p></div><div class="upcoming-actions"><select data-upcoming-list aria-label="Watchlist for ${escapeAttr(movie.title)}">${options}</select><button class="button button-quiet upcoming-add" data-add-upcoming="${escapeAttr(movie.tmdbId)}">+ Watchlist</button></div></div></article>`;
}
