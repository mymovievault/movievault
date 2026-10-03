import { movieCard } from "../components/movie-card.js";
import { statsGrid } from "../components/stats.js";
import { movieForm } from "../components/movie-form.js";
import { releaseReminders } from "../components/reminders.js";

export function homePage(library, watchlists = []) {
  const wishlistItems = [
    ...library.all(),
    ...watchlists.filter((list) => list.is_owner && list.name !== "My Library").flatMap((list) => list.items || []),
  ].filter((entry) => entry.status === "wishlist");
  const stats = { ...library.stats(), wishlist: new Set(wishlistItems.map((entry) => String(entry.tmdbId))).size };
  const watched = library.all().filter((entry) => entry.status === "watched" || entry.status === "watching").slice(0, 3);
  return `<main><section class="hero"><p class="eyebrow">YOUR PERSONAL FILM ARCHIVE</p><h1>A better place<br /><em>to remember</em> movies.</h1><p class="hero-copy">A quiet, considered home for the films you have seen, the ones waiting for you, and everything in between.</p><div class="hero-actions"><a class="button button-primary" href="#/library">Open watched <span>↗</span></a><a class="text-link" href="#/lists">See your watchlists</a></div></section>${releaseReminders(library.all())}${movieForm(watchlists)}${statsGrid(stats)}<section class="section-block"><div class="section-heading"><div><p class="eyebrow">RECENTLY LOGGED</p><h2>Favourites worth revisiting</h2></div><a class="text-link" href="#/library">View all <span>↗</span></a></div><div class="movie-grid">${watched.map(movieCard).join("")}</div></section></main>`;
}
