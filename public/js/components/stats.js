export function statsGrid(stats) {
  return `<section class="stats-grid"><div><strong>${stats.watched}</strong><span>Watched + watching</span></div><a class="stat-link" href="#/lists" aria-label="${stats.wishlist} Want to watch titles. Open Watchlists"><strong>${stats.wishlist}</strong><span>Want to watch</span></a><div><strong>${Math.round(stats.minutes / 60)}h</strong><span>Time spent</span></div><div><strong>${stats.averageRating ? stats.averageRating.toFixed(1) : "—"}</strong><span>Rated average</span></div></section>`;
}
