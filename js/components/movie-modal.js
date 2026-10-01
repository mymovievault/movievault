export function movieModal(movie) {
  if (!movie) return `<main class="error-state"><p>That title is not in the vault.</p><a class="text-link" href="#/">Return home ↗</a></main>`;
  return `<main><section class="detail"><img src="${movie.poster}" alt="${movie.title} poster" /><div class="detail-copy"><p class="eyebrow">${movie.status.toUpperCase()} / ${movie.year}</p><h1>${movie.title}</h1><p class="detail-facts">${movie.runtime} min <span>•</span> ${movie.genres.join(" / ")} <span>•</span> Directed by ${movie.director}</p><p class="detail-overview">${movie.overview}</p>${movie.notes ? `<blockquote>“${movie.notes}”</blockquote>` : ""}<a class="text-link" href="#/library">Back to collection ↗</a></div></section></main>`;
}
