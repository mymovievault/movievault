import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieCard(movie) {
  const rating = movie.rating ? `★ ${escapeHtml(movie.rating)}` : movie.tmdbRating ? `TMDB ★ ${Number(movie.tmdbRating).toFixed(1)}` : "—";
  const watchedWith = movie.watchedWith?.length ? `<p class="watched-with-line">With ${movie.watchedWith.map(escapeHtml).join(", ")}</p>` : "";
  const whereWatched = movie.watchingMode === "theatre" ? movie.theatreName : movie.ottPlatform;
  const viewingLocation = whereWatched ? `<p class="watched-with-line">${movie.watchingMode === "theatre" ? "At" : "On"} ${escapeHtml(whereWatched)}</p>` : "";
  return `<article class="movie-card"><a href="#/movie/${escapeAttr(movie.tmdbId)}" class="poster-wrap"><img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" loading="lazy" /><span class="status-pill">${escapeHtml(movie.status)}</span></a><div class="movie-meta"><div><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.year || "—")} <span class="dot">•</span> ${escapeHtml(movie.genres?.[0] || "Film")}</p>${watchedWith}${viewingLocation}</div><span class="rating">${rating}</span></div></article>`;
}
