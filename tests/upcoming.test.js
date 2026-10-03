import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { upcomingPage } from "../public/js/pages/upcoming.js";
import { movieModal } from "../public/js/components/movie-modal.js";

const entries = JSON.parse(await readFile(new URL("../public/data/upcoming.json", import.meta.url), "utf8"));

test("local upcoming fallback renders cards in the English section", () => {
  const html = upcomingPage(entries);
  assert.match(html, /data-upcoming-section="English"/);
  assert.ok(html.includes(entries[0].title));
  assert.doesNotMatch(html, /The curated list is empty/);
});

test("upcoming movie details show available data without requiring a vault record", () => {
  const html = movieModal(entries[0]);
  assert.ok(html.includes(entries[0].title));
  assert.match(html, /class="detail-overview">[\s\S]+?<\/p>/);
  assert.doesNotMatch(html, /0 min|Directed by<\/p>/);
  assert.match(html, /href="#\/upcoming">Back to Upcoming/);
});