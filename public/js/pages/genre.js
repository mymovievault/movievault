import { movieCard } from "../components/movie-card.js";
import { escapeHtml } from "../utils/escape.js";

export function genreMovies(genre, libraryMovies, watchlists = []) {
  const uniqueMovies = new Map();
  for (const movie of libraryMovies) uniqueMovies.set(String(movie.tmdbId), movie);
  for (const list of watchlists.filter((item) => item.is_owner)) {
    for (const movie of list.items || []) {
      if (!uniqueMovies.has(String(movie.tmdbId))) uniqueMovies.set(String(movie.tmdbId), movie);
    }
  }
  return [...uniqueMovies.values()].filter((movie) => movie.genres?.some((item) => item.toLowerCase() === genre.toLowerCase()));
}

export function genrePage(genre, movies) {
  const cards = movies.map(movieCard).join("");
  return `<main><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>${escapeHtml(genre)}</h1><p>${movies.length} matching title${movies.length === 1 ? "" : "s"} in your library and watchlists.</p></section><section class="movie-grid movie-grid-large">${cards || `<div class="empty-state">No saved titles in this genre yet.</div>`}</section></main>`;
}