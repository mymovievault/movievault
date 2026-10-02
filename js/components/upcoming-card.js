export function upcomingCard(movie) {
  return `<article class="movie-card"><a href="#/movie/${movie.tmdbId}" class="poster-wrap"><img src="${movie.poster}" alt="${movie.title} poster" loading="lazy" /><span class="status-pill">${movie.languageLabel || "curated"}</span></a><div class="movie-meta"><div><h3>${movie.title}</h3><p>${movie.releaseDate || "Release date TBA"} <span class="dot">•</span> ${movie.category || movie.genres?.[0] || "Film"}</p></div><button class="button button-quiet upcoming-add" data-add-upcoming="${movie.tmdbId}">+ Watchlist</button></div></article>`;
}
