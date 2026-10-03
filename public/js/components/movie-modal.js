import { escapeAttr, escapeHtml } from "../utils/escape.js";

function personHref(person, fallbackSource = "TMDB") {
  if (!person?.id) return "";
  const source = String(person.source || fallbackSource).toLowerCase();
  return `#/person/${source}/${encodeURIComponent(person.id)}`;
}

export function movieModal(movie) {
  if (!movie) return `<main class="error-state"><p>Movie details are unavailable.</p><a class="text-link" href="#/">Return to Overview ↗</a></main>`;
  const watchedWith = movie.watchedWith?.length ? `<p class="detail-watched-with">Watched with ${movie.watchedWith.map(escapeHtml).join(", ")}</p>` : "";
  const genres = movie.genres?.map((genre) => `<a class="detail-fact-link" href="#/genre/${encodeURIComponent(genre)}">${escapeHtml(genre)}</a>`).join(" / ") || "";
  const directorPerson = movie.directorPerson || (movie.directorId ? { id: movie.directorId, name: movie.director, source: movie.metadataSource } : null);
  const directorName = movie.directorPerson?.name || movie.director || "";
  const directorHref = personHref(directorPerson, movie.metadataSource || "TMDB");
  const director = directorName ? `Directed by ${directorHref ? `<a class="detail-person-link" href="${directorHref}">${escapeHtml(directorName)}</a>` : escapeHtml(directorName)}` : "";
  const facts = [
    movie.runtime ? `${movie.runtime} min` : "",
    genres,
    director,
  ].filter(Boolean).join(" <span>•</span> ");
  const factsMarkup = facts ? `<p class="detail-facts">${facts}</p>` : "";
  const returnRoute = movie.status === "upcoming" ? "/upcoming" : "/library";
  const returnLabel = movie.status === "upcoming" ? "Back to Upcoming" : "Back to collection";
  const posterMarkup = movie.poster ? `<img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)} poster" />` : `<div class="detail-poster-placeholder" role="img" aria-label="No poster available"><span>Poster unavailable</span></div>`;
  const cast = movie.cast?.filter((person) => person.name).slice(0, 8) || [];
  const castMarkup = cast.length ? `<section class="detail-cast"><h2>Cast</h2><ul>${cast.map((person) => { const href = personHref(person, movie.metadataSource || "TMDB"); const name = href ? `<a class="detail-person-link" href="${href}">${escapeHtml(person.name)}</a>` : escapeHtml(person.name); return `<li class="cast-member">${person.profile ? `<img src="${escapeAttr(person.profile)}" alt="" loading="lazy" />` : `<span class="cast-avatar" aria-hidden="true">${escapeHtml(person.name[0].toUpperCase())}</span>`}<span><strong>${name}</strong>${person.character ? `<small>${escapeHtml(person.character)}</small>` : ""}</span></li>`; }).join("")}</ul></section>` : "";
  const productionMarkup = movie.productionCompanies?.length ? `<p class="detail-production"><strong>Production</strong>${movie.productionCompanies.map(escapeHtml).join(" <span>•</span> ")}</p>` : "";
  const taglineMarkup = movie.tagline ? `<p class="detail-tagline">${escapeHtml(movie.tagline)}</p>` : "";
  const sourceMarkup = movie.metadataSource === "Wikidata" && movie.wikidataId ? `<p class="detail-source">Metadata from <a href="https://www.wikidata.org/wiki/${escapeAttr(movie.wikidataId)}" target="_blank" rel="noopener noreferrer">Wikidata</a> (CC0)</p>` : "";
  return `<main><section class="detail">${posterMarkup}<div class="detail-copy"><p class="eyebrow">${escapeHtml(movie.status?.toUpperCase())} / ${escapeHtml(movie.year)}</p><h1>${escapeHtml(movie.title)}</h1>${taglineMarkup}${factsMarkup}<p class="detail-overview">${escapeHtml(movie.overview)}</p>${castMarkup}${productionMarkup}${sourceMarkup}${watchedWith}${movie.notes ? `<blockquote>“${escapeHtml(movie.notes)}”</blockquote>` : ""}<a class="text-link" href="#${returnRoute}">${returnLabel} ↗</a></div></section></main>`;
}
