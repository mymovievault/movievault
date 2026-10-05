import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../public/js/utils/escape.js";
import { validWatchedWith } from "../api/_lib/watched-with.js";
import { validateProfile } from "../api/_lib/profile.js";
import { movieEditForm } from "../public/js/components/movie-form.js";
import { createTheatreClient } from "../public/js/api/places.js";

test("escapes dynamic HTML content", () => {
  assert.equal(escapeHtml(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtml(`quote & ' apostrophe`), "quote &amp; &#39; apostrophe");
});

test("watched-with input accepts unique usernames and rejects malformed lists", () => {
  assert.equal(validWatchedWith(["alex", "sam"]), true);
  assert.equal(validWatchedWith([]), true);
  assert.equal(validWatchedWith("alex"), false);
  assert.equal(validWatchedWith(["alex", "alex"]), false);
  assert.equal(validWatchedWith([""]), false);
  assert.equal(validWatchedWith(Array(21).fill("alex")), false);
});

test("saved movie edit form includes current location and watched-with selections", () => {
  const form = movieEditForm({
    tmdbId: "tmdb:movie:12",
    status: "watched",
    watchingMode: "theatre",
    theatreName: "Grand Cinema",
    watchedWith: ["alex"],
  });
  assert.match(form, /value="theatre" selected/);
  assert.match(form, /value="Grand Cinema"/);
  assert.match(form, /data-remove-watched-with="alex"/);
  assert.match(form, /data-watched-with/);
  assert.match(form, /id="edit-watched-with-results-tmdb:movie:12"/);
  assert.match(form, /data-theatre-search/);
  assert.match(form, /data-theatre-results/);
});

test("nearby theatre search uses a bounded area and returns the nearest 30 cinemas", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let acceptHeader = "";
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    acceptHeader = options.headers.Accept;
    return {
      ok: true,
      json: async () => [
        ...Array.from({ length: 35 }, (_, index) => ({
          name: `Cinema ${String(index).padStart(2, "0")}`,
          type: "cinema",
          lat: String(40 + index * 0.004),
          lon: "-74",
          display_name: `Cinema ${String(index).padStart(2, "0")}, Sampletown`,
        })),
        { name: "Not a cinema", type: "road", lat: "40", lon: "-74", display_name: "Not a cinema" },
        { name: "", type: "cinema", lat: "40", lon: "-74", display_name: "Unnamed place" },
      ],
    };
  };
  try {
    const places = await createTheatreClient().nearby(40, -74);
    assert.equal(requestedUrl.hostname, "nominatim.openstreetmap.org");
    assert.equal(requestedUrl.searchParams.get("q"), "cinema");
    assert.equal(requestedUrl.searchParams.get("limit"), "40");
    assert.equal(requestedUrl.searchParams.get("bounded"), "1");
    assert.equal(acceptHeader, "application/json");
    assert.equal(places.length, 30);
    assert.equal(places[0].name, "Cinema 00");
    assert.equal(places.at(-1).name, "Cinema 29");
    assert.ok(places.every((place) => place.distance <= 15));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("profile details are normalized and validated", () => {
  assert.deepEqual(validateProfile({ displayName: "  Movie Fan  ", email: " FAN@example.com ", mobileNumber: "+1 (415) 555-0123" }), {
    profile: { displayName: "Movie Fan", email: "fan@example.com", mobileNumber: "+1 (415) 555-0123" },
  });
  assert.match(validateProfile({ email: "not-an-email" }).error, /valid email/i);
  assert.match(validateProfile({ mobileNumber: "123" }).error, /7-15 digits/i);
  assert.match(validateProfile({ displayName: "x".repeat(81) }).error, /80 characters/i);
});
