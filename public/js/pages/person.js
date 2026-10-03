import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function personPage(person, message = "") {
  if (!person) return `<main class="person-state"><p>${escapeHtml(message || "Loading person details...")}</p></main>`;
  const facts = [person.knownForDepartment, person.occupations?.join(" / "), person.birthDate && `Born ${person.birthDate}`, person.deathDate && `Died ${person.deathDate}`, person.placeOfBirth].filter(Boolean);
  const profile = person.profile
    ? `<img class="person-profile-image" src="${escapeAttr(person.profile)}" alt="${escapeAttr(person.name)}" />`
    : `<div class="detail-poster-placeholder person-image-placeholder" role="img" aria-label="No portrait available"><span>${escapeHtml(person.name?.[0]?.toUpperCase() || "?")}</span></div>`;
  const source = person.source === "Wikidata" && person.id
    ? `<p class="detail-source">Profile from <a href="https://www.wikidata.org/wiki/${escapeAttr(person.id)}" target="_blank" rel="noopener noreferrer">Wikidata</a> (CC0)</p>`
    : "";
  return `<main><section class="detail person-detail">${profile}<div class="detail-copy"><p class="eyebrow">${escapeHtml(person.knownForDepartment || person.occupations?.[0] || "PERSON")}</p><h1>${escapeHtml(person.name)}</h1>${facts.length ? `<p class="detail-facts">${facts.map(escapeHtml).join(" <span>•</span> ")}</p>` : ""}<p class="detail-overview">${escapeHtml(person.biography || "No biography is available for this person.")}</p>${source}</div></section></main>`;
}