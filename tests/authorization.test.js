import test from "node:test";
import assert from "node:assert/strict";
import { createLibrary } from "../js/data/library.js";

test("library records remain isolated by the repository instance", () => {
  const firstUser = createLibrary([{ tmdbId: 1, title: "Private one", status: "watched" }]);
  const secondUser = createLibrary([{ tmdbId: 2, title: "Private two", status: "watched" }]);
  assert.equal(firstUser.find(2), undefined);
  assert.equal(secondUser.find(1), undefined);
});

test("library update does not mutate an unrelated record", () => {
  const library = createLibrary([{ tmdbId: 10, title: "Owned", status: "wishlist" }]);
  library.update(10, { status: "watched" });
  assert.equal(library.find(10).status, "watched");
  assert.equal(library.find(11), undefined);
});
