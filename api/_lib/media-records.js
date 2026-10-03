const USER_FIELDS = new Set([
  "status",
  "rating",
  "watchedDate",
  "notes",
  "tags",
  "watchingMode",
  "ottPlatform",
  "ottAvailability",
  "theatreName",
  "watchedWith",
  "listId",
  "curatedNote",
]);

export function mediaAliases(record) {
  const aliases = [];
  const source = String(record.metadataSource || "").toLowerCase();
  if (source === "wikidata" || record.wikidataId) {
    const id = record.wikidataId || String(record.tmdbId || "").replace(/^wikidata:/, "");
    if (id) aliases.push({ provider: "wikidata", externalId: id });
    if (record.externalIds?.tmdb) aliases.push({ provider: `tmdb:${record.mediaType === "tv" ? "tv" : "movie"}`, externalId: String(record.externalIds.tmdb) });
  } else if (source === "manual") {
    if (record.tmdbId) aliases.push({ provider: "manual", externalId: String(record.tmdbId) });
  } else if (record.tmdbId) {
    const mediaType = record.mediaType === "tv" ? "tv" : "movie";
    const id = record.externalIds?.tmdb || record.tmdbId;
    aliases.push({ provider: `tmdb:${mediaType}`, externalId: String(id) });
  }
  const imdbId = record.externalIds?.imdb;
  if (imdbId) aliases.push({ provider: "imdb", externalId: String(imdbId).toLowerCase() });
  return aliases;
}

export function canonicalMediaId(record) {
  if (record.canonicalId) return String(record.canonicalId);
  const imdbId = record.externalIds?.imdb;
  if (imdbId) return `imdb:${String(imdbId).toLowerCase()}`;
  const source = String(record.metadataSource || "").toLowerCase();
  if (source === "wikidata" || record.wikidataId) {
    return `wikidata:${record.wikidataId || String(record.tmdbId || "").replace(/^wikidata:/, "")}`;
  }
  if (source === "manual") return `manual:${record.tmdbId || Date.now()}`;
  return `tmdb:${record.mediaType === "tv" ? "tv" : "movie"}:${record.externalIds?.tmdb || record.tmdbId || Date.now()}`;
}

export function splitMediaRecord(record, mediaId) {
  const catalog = Object.fromEntries(Object.entries(record).filter(([key]) => !USER_FIELDS.has(key) && key !== "tmdbId"));
  const user = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "tmdbId" && ![
    "canonicalId", "wikidataId", "mediaType", "metadataSource", "title", "name", "year", "releaseDate", "poster", "backdrop", "overview", "tagline", "genres", "runtime", "tmdbRating", "director", "directorPerson", "cast", "productionCompanies", "externalIds",
  ].includes(key)));
  catalog.canonicalId = mediaId;
  user.tmdbId = mediaId;
  return { catalog, user };
}

export function mergeMediaRecord(catalogRecord, userRecord, mediaId) {
  return { ...(catalogRecord || {}), ...(userRecord || {}), tmdbId: String(mediaId), canonicalId: String(mediaId) };
}