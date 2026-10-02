import { upcomingCard } from "../components/upcoming-card.js";

export function upcomingPage(entries) {
	 const order = ["Most talked about", "Tamil", "Telugu", "Malayalam", "Kannada", "Hindi", "English"];
	 const groups = new Map(order.map((label) => [label, []]));
	 entries.forEach((entry) => {
		 const label = entry.category === "Most talked about" ? entry.category : entry.languageLabel;
		 if (groups.has(label)) groups.get(label).push(entry);
	 });
	 const available = order.filter((label) => groups.get(label).length);
	 const sections = available.map((label) => `<section class="upcoming-section" data-upcoming-section="${label}"><div class="section-heading"><div><p class="eyebrow">${label === "Most talked about" ? "TRENDING NOW" : "LANGUAGE"}</p><h2>${label}</h2></div><span class="section-count">${groups.get(label).length} titles</span></div><div class="movie-grid movie-grid-large">${groups.get(label).map(upcomingCard).join("")}</div></section>`).join("");
	 const options = ["All", ...available].map((label, index) => `<button type="button" class="upcoming-filter-button${index === 0 ? " is-active" : ""}" data-upcoming-filter="${label}">${label}</button>`).join("");
	 return `<main><section class="page-heading"><p class="eyebrow">LIVE TMDB SELECTION</p><h1>Upcoming</h1><p>${entries.length} titles across trending and language sections.</p><div class="upcoming-filters" role="tablist" aria-label="Upcoming categories">${options}</div></section>${sections || `<div class="empty-state">The curated list is empty.</div>`}</main>`;
}
