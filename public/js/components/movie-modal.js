import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieModal(movie) {
  if (!movie) return `<main class="error-state"><p>That title is not in the vault.</p><a class="text-link" href="#/">Return home ↗</a></main>`;
  const watchedWith = movie.watchedWith?.length ? `<p class="detail-watched-with">Watched with ${movie.watchedWith.map(escapeHtml).join(", ")}</p>` : "";
  return `<main><section class="detail"><img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" /><div class="detail-copy"><p class="eyebrow">${escapeHtml(movie.status?.toUpperCase())} / ${escapeHtml(movie.year)}</p><h1>${escapeHtml(movie.title)}</h1><p class="detail-facts">${escapeHtml(movie.runtime)} min <span>•</span> ${escapeHtml(movie.genres?.join(" / "))} <span>•</span> Directed by ${escapeHtml(movie.director)}</p><p class="detail-overview">${escapeHtml(movie.overview)}</p>${watchedWith}${movie.notes ? `<blockquote>“${escapeHtml(movie.notes)}”</blockquote>` : ""}<a class="text-link" href="#/library">Back to collection ↗</a></div></section></main>`;
}
