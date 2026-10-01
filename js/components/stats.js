export function statsGrid(stats) {
  return `<section class="stats-grid"><div><strong>${stats.watched}</strong><span>Watched + watching</span></div><div><strong>${stats.wishlist}</strong><span>On the list</span></div><div><strong>${Math.round(stats.minutes / 60)}h</strong><span>Time spent</span></div><div><strong>${stats.averageRating.toFixed(1)}</strong><span>Your average</span></div></section>`;
}
