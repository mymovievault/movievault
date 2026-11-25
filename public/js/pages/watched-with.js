import { movieCard } from "../components/movie-card.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function watchedWithPage(library) {
  const people = new Map();
  for (const movie of library.all()) {
    if (movie.status !== "watched") continue;
    for (const username of movie.watchedWith || []) {
      if (!people.has(username)) people.set(username, []);
      people.get(username).push(movie);
    }
  }
  const sorted = [...people.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const tabs = sorted.length ? `<div class="watched-with-tabs" role="tablist"><button type="button" class="button button-quiet is-active" data-watched-with-tab="all">All (${sorted.length})</button>${sorted.map(([username, movies]) => `<button type="button" class="button button-quiet" data-watched-with-tab="${escapeAttr(username)}">@${escapeHtml(username)} (${movies.length})</button>`).join("")}</div>` : "";
  const sections = sorted.map(([username, movies]) => `<section class="watched-with-group" data-watched-with-group="${escapeAttr(username)}"><h2>With @${escapeHtml(username)}</h2><div class="movie-grid movie-grid-large">${movies.map(movieCard).join("")}</div></section>`).join("");
  return `<main class="library-page"><section class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>Watched with</h1><p>${sorted.length ? "Movies you watched together with other people." : "No movies tagged with people yet. Add people under “Watched with” when you log or edit a watched movie."}</p>${tabs}</section>${sections}</main>`;
}

export function bindWatchedWith(root) {
  const tabs = root.querySelectorAll("[data-watched-with-tab]");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    root.querySelectorAll("[data-watched-with-group]").forEach((group) => { group.hidden = tab.dataset.watchedWithTab !== "all" && group.dataset.watchedWithGroup !== tab.dataset.watchedWithTab; });
  }));
}
