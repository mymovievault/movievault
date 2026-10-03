import { setCors } from "../cors.js";
import { rateLimit } from "../rate-limit.js";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const MOVIE_DESCRIPTION = /film|movie|television series|tv series|miniseries/i;

function itemId(statement) {
  return statement?.mainsnak?.datavalue?.value?.id || "";
}

function claimValue(entity, property) {
  return entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
}

function claimIds(entity, property) {
  return (entity.claims?.[property] || []).map((statement) => itemId(statement)).filter(Boolean);
}

function claimDate(entity) {
  const time = claimValue(entity, "P577")?.time || "";
  const match = time.match(/^[+-](\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

export function searchResults(data) {
  return (data.search || [])
    .filter((item) => item.id && MOVIE_DESCRIPTION.test(item.description || ""))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.label,
      name: item.label,
      description: item.description || "",
      media_type: "wikidata",
      source: "Wikidata",
    }));
}

export function normalizeEntity(entity, labels) {
  const description = entity.descriptions?.en?.value || "";
  const releaseDate = claimDate(entity);
  const castStatements = (entity.claims?.P161 || []).slice().sort((left, right) => {
    const leftOrder = Number(left.qualifiers?.P1545?.[0]?.datavalue?.value || Infinity);
    const rightOrder = Number(right.qualifiers?.P1545?.[0]?.datavalue?.value || Infinity);
    return leftOrder - rightOrder;
  }).slice(0, 8);
  const cast = castStatements.map((statement) => {
    const id = itemId(statement);
    return { id, name: labels[id] || "", character: "", profile: "", source: "Wikidata" };
  }).filter((person) => person.name);
  const directorId = claimIds(entity, "P57").find((id) => labels[id]) || "";
  const director = labels[directorId] || "";
  const runtimeAmount = claimValue(entity, "P2047")?.amount;

  return {
    tmdbId: `wikidata:${entity.id}`,
    wikidataId: entity.id,
    mediaType: /series|television|tv/i.test(description) ? "tv" : "movie",
    metadataSource: "Wikidata",
    externalIds: { wikidata: entity.id, tmdb: claimValue(entity, "P4947") || claimValue(entity, "P4983") || "", imdb: claimValue(entity, "P345") || "" },
    title: entity.labels?.en?.value || entity.id,
    year: Number(releaseDate.slice(0, 4)) || null,
    releaseDate: releaseDate || null,
    poster: "",
    backdrop: "",
    overview: description,
    tagline: "",
    genres: claimIds(entity, "P136").map((id) => labels[id]).filter(Boolean),
    runtime: Number.parseFloat(runtimeAmount) || 0,
    tmdbRating: null,
    director,
    directorPerson: directorId ? { id: directorId, name: director, profile: "", source: "Wikidata" } : null,
    cast,
    productionCompanies: claimIds(entity, "P272").map((id) => labels[id]).filter(Boolean),
  };
}

function claimDateFor(entity, property) {
  const time = claimValue(entity, property)?.time || "";
  const match = time.match(/^[+-](\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

export function normalizePerson(entity, labels) {
  const placeId = claimIds(entity, "P19")[0];
  const birthDate = claimDateFor(entity, "P569");
  const deathDate = claimDateFor(entity, "P570");
  return {
    id: entity.id,
    name: entity.labels?.en?.value || entity.id,
    source: "Wikidata",
    biography: entity.descriptions?.en?.value || "",
    birthDate,
    deathDate,
    placeOfBirth: labels[placeId] || "",
    occupations: claimIds(entity, "P106").map((id) => labels[id]).filter(Boolean),
    profile: "",
  };
}

async function wikidataJson(url, origin) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "User-Agent": `MovieVault/1.0 (${origin || "https://movievault-weld.vercel.app"}; metadata fallback)`,
    },
  });
  if (!response.ok) throw new Error(`Wikidata request failed (${response.status})`);
  return response.json();
}

async function wikidataUrl(parameters, origin) {
  const url = new URL(WIKIDATA_API);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return wikidataJson(url, origin);
}

async function search(query, origin) {
  const data = await wikidataUrl({
    action: "wbsearchentities",
    search: query,
    language: "en",
    type: "item",
    limit: "8",
    format: "json",
  }, origin);
  return searchResults(data);
}

async function details(id, origin) {
  const data = await wikidataUrl({
    action: "wbgetentities",
    ids: id,
    props: "labels|descriptions|claims",
    languages: "en",
    format: "json",
  }, origin);
  const entity = data.entities?.[id];
  if (!entity || entity.missing !== undefined) throw new Error("Wikidata movie not found.");

  const relatedIds = [
    ...claimIds(entity, "P161").slice(0, 8),
    ...claimIds(entity, "P57"),
    ...claimIds(entity, "P136"),
    ...claimIds(entity, "P272"),
  ];
  const uniqueIds = [...new Set(relatedIds)];
  let labels = {};
  if (uniqueIds.length) {
    const labelData = await wikidataUrl({
      action: "wbgetentities",
      ids: uniqueIds.join("|"),
      props: "labels",
      languages: "en",
      format: "json",
    }, origin);
    labels = Object.fromEntries(Object.entries(labelData.entities || {}).map(([entityId, item]) => [entityId, item.labels?.en?.value || ""]));
  }
  return normalizeEntity(entity, labels);
}

async function personDetails(id, origin) {
  const data = await wikidataUrl({
    action: "wbgetentities",
    ids: id,
    props: "labels|descriptions|claims",
    languages: "en",
    format: "json",
  }, origin);
  const entity = data.entities?.[id];
  if (!entity || entity.missing !== undefined) throw new Error("Wikidata person not found.");
  const relatedIds = [...claimIds(entity, "P19"), ...claimIds(entity, "P106")];
  const uniqueIds = [...new Set(relatedIds)];
  let labels = {};
  if (uniqueIds.length) {
    const labelData = await wikidataUrl({
      action: "wbgetentities",
      ids: uniqueIds.join("|"),
      props: "labels",
      languages: "en",
      format: "json",
    }, origin);
    labels = Object.fromEntries(Object.entries(labelData.entities || {}).map(([entityId, item]) => [entityId, item.labels?.en?.value || ""]));
  }
  return normalizePerson(entity, labels);
}

export default async function metadata(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  const retryAfter = rateLimit(request, "wikidata", 30, 60 * 1000);
  if (retryAfter) return response.status(429).json({ error: "Metadata request limit reached. Try again shortly.", retryAfter });

  try {
    const query = String(request.query?.query || "").trim();
    const id = String(request.query?.id || "");
    const personId = String(request.query?.personId || "");
    const origin = request.headers.origin || process.env.FRONTEND_ORIGIN || "";
    if (query.length >= 2 && query.length <= 100) return response.status(200).json(await search(query, origin));
    if (/^Q\d+$/.test(personId)) return response.status(200).json(await personDetails(personId, origin));
    if (/^Q\d+$/.test(id)) return response.status(200).json(await details(id, origin));
    return response.status(400).json({ error: "Provide a movie search query or Wikidata item ID." });
  } catch {
    return response.status(502).json({ error: "Wikidata metadata is temporarily unavailable." });
  }
}