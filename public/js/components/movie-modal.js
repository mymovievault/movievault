import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieModal(movie) {
  if (!movie) return `<main class="error-state"><p>Movie details are unavailable.</p><a class="text-link" href="#/">Return to Overview ↗</a></main>`;
  const watchedWith = movie.watchedWith?.length ? `<p class="detail-watched-with">Watched with ${movie.watchedWith.map(escapeHtml).join(", ")}</p>` : "";
  const facts = [
    movie.runtime ? `${movie.runtime} min` : "",
    movie.genres?.length ? movie.genres.join(" / ") : "",
    movie.director ? `Directed by ${movie.director}` : "",
  ].filter(Boolean).map(escapeHtml).join(" <span>•</span> ");
  const factsMarkup = facts ? `<p class="detail-facts">${facts}</p>` : "";
  const returnRoute = movie.status === "upcoming" ? "/upcoming" : "/library";
  const returnLabel = movie.status === "upcoming" ? "Back to Upcoming" : "Back to collection";
  return `<main><section class="detail"><img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" /><div class="detail-copy"><p class="eyebrow">${escapeHtml(movie.status?.toUpperCase())} / ${escapeHtml(movie.year)}</p><h1>${escapeHtml(movie.title)}</h1>${factsMarkup}<p class="detail-overview">${escapeHtml(movie.overview)}</p>${watchedWith}${movie.notes ? `<blockquote>“${escapeHtml(movie.notes)}”</blockquote>` : ""}<a class="text-link" href="#${returnRoute}">${returnLabel} ↗</a></div></section></main>`;
}
