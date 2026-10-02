import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieCard(movie) {
  const rating = movie.rating ? `★ ${escapeHtml(movie.rating)}` : movie.tmdbRating ? `TMDB ★ ${Number(movie.tmdbRating).toFixed(1)}` : "—";
  return `<article class="movie-card"><a href="#/movie/${escapeAttr(movie.tmdbId)}" class="poster-wrap"><img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" loading="lazy" /><span class="status-pill">${escapeHtml(movie.status)}</span></a><div class="movie-meta"><div><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.year || "—")} <span class="dot">•</span> ${escapeHtml(movie.genres?.[0] || "Film")}</p></div><span class="rating">${rating}</span></div></article>`;
}
