import { upcomingCard } from "../components/upcoming-card.js";

export function upcomingPage(entries) {
	 return `<main><section class="page-heading"><p class="eyebrow">EDITORIAL SELECTION</p><h1>Upcoming</h1><p>${entries.length} curated title${entries.length === 1 ? "" : "s"} in the release watchlist.</p></section><section class="movie-grid movie-grid-large">${entries.length ? entries.map(upcomingCard).join("") : `<div class="empty-state">The curated list is empty.</div>`}</section></main>`;
}
