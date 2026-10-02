import { upcomingCard } from "../components/upcoming-card.js";

export function upcomingPage(entries) {
	 const order = ["Most talked about", "Tamil", "Telugu", "Malayalam", "Kannada", "Hindi", "English"];
	 const groups = new Map(order.map((label) => [label, []]));
	 entries.forEach((entry) => {
		 const label = entry.category === "Most talked about" ? entry.category : entry.languageLabel;
		 if (groups.has(label)) groups.get(label).push(entry);
	 });
	 const sections = order.filter((label) => groups.get(label).length).map((label) => `<section class="upcoming-section"><div class="section-heading"><div><p class="eyebrow">${label === "Most talked about" ? "TRENDING NOW" : "LANGUAGE"}</p><h2>${label}</h2></div><span class="section-count">${groups.get(label).length} titles</span></div><div class="movie-grid movie-grid-large">${groups.get(label).map(upcomingCard).join("")}</div></section>`).join("");
	 return `<main><section class="page-heading"><p class="eyebrow">LIVE TMDB SELECTION</p><h1>Upcoming</h1><p>${entries.length} titles across trending and language sections.</p></section>${sections || `<div class="empty-state">The curated list is empty.</div>`}</main>`;
}
