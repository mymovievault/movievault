import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { upcomingPage } from "../public/js/pages/upcoming.js";

const entries = JSON.parse(await readFile(new URL("../public/data/upcoming.json", import.meta.url), "utf8"));

test("local upcoming fallback renders cards in the English section", () => {
  const html = upcomingPage(entries);
  assert.match(html, /data-upcoming-section="English"/);
  assert.ok(html.includes(entries[0].title));
  assert.doesNotMatch(html, /The curated list is empty/);
});