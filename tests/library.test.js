import test from "node:test";
import assert from "node:assert/strict";
import { createLibrary, findByTmdbId } from "../public/js/data/library.js";

const records = [
  { tmdbId: 1, title: "Watched", status: "watched", runtime: 120, rating: 8 },
  { tmdbId: 2, title: "List", status: "wishlist", runtime: 100, rating: null },
];

test("library reports collection statistics", () => {
  const library = createLibrary(records);
  assert.deepEqual(library.stats(), {
    total: 2,
    watched: 1,
    wishlist: 1,
    minutes: 120,
    averageRating: 8,
  });
});

test("library adds and finds a record", () => {
  const library = createLibrary([]);
  const added = library.add({ tmdbId: 7, title: "New title", status: "watching" });
  assert.equal(added.tmdbId, 7);
  assert.equal(library.find(7).title, "New title");
  assert.equal(library.all().length, 1);
});

test("library add replaces a record with the same canonical media ID", () => {
  const library = createLibrary([{ tmdbId: "imdb:tt42", title: "Example", status: "watched" }]);
  library.add({ tmdbId: "imdb:tt42", title: "Example", status: "wishlist" });
  assert.equal(library.all().length, 1);
  assert.equal(library.find("imdb:tt42").status, "wishlist");
});

test("finds watchlist-only records by numeric or string TMDB ID", () => {
  const watchlistItems = [{ tmdbId: "1003596", title: "Wishlist title" }];
  assert.equal(findByTmdbId(watchlistItems, 1003596).title, "Wishlist title");
  assert.equal(findByTmdbId(watchlistItems, "missing"), undefined);
});

test("library updates a record without mutating the input", () => {
  const library = createLibrary(records);
  library.update(1, { rating: 10 });
  assert.equal(library.find(1).rating, 10);
  assert.equal(records[0].rating, 8);
});

test("library updates and removes namespaced provider IDs", () => {
  const library = createLibrary([{ tmdbId: "wikidata:Q83495", title: "The Matrix", status: "watched" }]);
  library.update("wikidata:Q83495", { rating: 9 });
  assert.equal(library.find("wikidata:Q83495").rating, 9);
  library.remove("wikidata:Q83495");
  assert.equal(library.all().length, 0);
});
