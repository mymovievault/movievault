export function movieCard(movie) {
  return `<article class="movie-card"><a href="#/movie/${movie.tmdbId}" class="poster-wrap"><img src="${movie.poster}" alt="${movie.title} poster" loading="lazy" /><span class="status-pill">${movie.status}</span></a><div class="movie-meta"><div><h3>${movie.title}</h3><p>${movie.year} <span class="dot">•</span> ${movie.genres?.[0] || "Film"}</p></div><span class="rating">${movie.rating ? `★ ${movie.rating}` : "—"}</span></div></article>`;
}
