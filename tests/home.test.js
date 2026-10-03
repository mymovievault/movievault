import test from "node:test";
import assert from "node:assert/strict";
import { homePage } from "../public/js/pages/home.js";
import { createLibrary } from "../public/js/data/library.js";

test("home want-to-watch count includes unique entries from owned named lists", () => {
  const library = createLibrary([{ tmdbId: 1, title: "Vault title", status: "wishlist" }]);
  const watchlists = [
    { name: "My Library", is_owner: true, items: [{ tmdbId: 1, status: "wishlist" }, { tmdbId: 2, status: "wishlist" }] },
    { name: "Weekend", is_owner: true, items: [{ tmdbId: 1, status: "wishlist" }, { tmdbId: 3, status: "wishlist" }, { tmdbId: 4, status: "watched" }] },
    { name: "Shared", is_owner: false, items: [{ tmdbId: 5, status: "wishlist" }] },
  ];

  const html = homePage(library, watchlists);
  assert.match(html, /<strong>2<\/strong><span>Want to watch<\/span>/);
  assert.match(html, /<a class="stat-link" href="#\/lists"[^>]*><strong>2<\/strong><span>Want to watch<\/span><\/a>/);
});