import test from "node:test";
import assert from "node:assert/strict";
import { canonicalMediaId, mediaAliases, mergeMediaRecord, splitMediaRecord } from "../api/_lib/media-records.js";

test("TMDB and Wikidata records resolve to a shared IMDb identity", () => {
  const tmdb = { tmdbId: 42, mediaType: "movie", metadataSource: "TMDB", externalIds: { tmdb: "42", imdb: "tt0042" } };
  const wikidata = { tmdbId: "wikidata:Q42", wikidataId: "Q42", mediaType: "movie", metadataSource: "Wikidata", externalIds: { wikidata: "Q42", tmdb: "42", imdb: "tt0042" } };
  assert.equal(canonicalMediaId(tmdb), "imdb:tt0042");
  assert.equal(canonicalMediaId(wikidata), "imdb:tt0042");
  assert.ok(mediaAliases(tmdb).some((alias) => alias.provider === "tmdb:movie" && alias.externalId === "42"));
  assert.ok(mediaAliases(wikidata).some((alias) => alias.provider === "tmdb:movie" && alias.externalId === "42"));
});

test("legacy prefixed TMDB IDs alias with current numeric TMDB IDs", () => {
  const current = { tmdbId: 950028, mediaType: "movie", metadataSource: "TMDB", externalIds: { tmdb: "950028" } };
  const legacy = { tmdbId: "tmdb:movie:950028", mediaType: "movie", externalIds: { tmdb: "tmdb:movie:950028" } };
  assert.deepEqual(mediaAliases(legacy), mediaAliases(current));
  assert.equal(canonicalMediaId(legacy), "tmdb:movie:950028");
});

test("shared metadata and owner-specific fields split and recombine", () => {
  const { catalog, user } = splitMediaRecord({ tmdbId: 42, title: "Example", cast: [{ name: "Actor" }], status: "watched", rating: 9, notes: "Personal note" }, "imdb:tt0042");
  assert.equal(catalog.title, "Example");
  assert.equal(user.notes, "Personal note");
  assert.equal(user.title, undefined);
  assert.deepEqual(mergeMediaRecord(catalog, user, "imdb:tt0042"), { ...catalog, ...user, tmdbId: "imdb:tt0042", canonicalId: "imdb:tt0042" });
});