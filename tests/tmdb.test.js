import test from "node:test";
import assert from "node:assert/strict";
import { createTmdbClient } from "../public/js/api/tmdb.js";
import { movieModal } from "../public/js/components/movie-modal.js";

test("TMDB details include cast, tagline, production, and render them on the movie page", async () => {
  const originalFetch = globalThis.fetch;
  const cast = Array.from({ length: 9 }, (_, index) => ({
    id: index + 1,
    name: `Actor ${index + 1}`,
    character: `Character ${index + 1}`,
    profile_path: index === 0 ? "/actor.jpg" : null,
  }));
  globalThis.fetch = async (url) => {
    assert.match(url, /append_to_response=credits/);
    return {
      ok: true,
      json: async () => ({
        id: 42,
        title: "Example Film",
        release_date: "2026-01-02",
        poster_path: "/poster.jpg",
        overview: "A test story.",
        tagline: "A test tagline.",
        genres: [{ name: "Drama" }],
        runtime: 100,
        vote_average: 8,
        production_companies: [{ name: "Example Studio" }],
        credits: { cast, crew: [{ id: 99, job: "Director", name: "Example Director", profile_path: "/director.jpg" }] },
      }),
    };
  };

  try {
    const details = await createTmdbClient({ token: "test-token" }).details({ media_type: "movie", id: 42 });
    assert.equal(details.cast.length, 8);
    assert.deepEqual(details.directorPerson, { id: 99, name: "Example Director", profile: "https://image.tmdb.org/t/p/w185/director.jpg", source: "TMDB" });
    assert.deepEqual(details.cast[0], {
      id: 1,
      name: "Actor 1",
      character: "Character 1",
      profile: "https://image.tmdb.org/t/p/w185/actor.jpg",
      source: "TMDB",
    });
    assert.equal(details.tagline, "A test tagline.");
    assert.deepEqual(details.productionCompanies, ["Example Studio"]);

    const html = movieModal({ ...details, status: "watched" });
    assert.match(html, /Actor 1/);
    assert.match(html, /Character 1/);
    assert.match(html, /href="#\/person\/tmdb\/1"/);
    assert.match(html, /href="#\/person\/tmdb\/99"/);
    assert.match(html, /href="#\/genre\/Drama"/);
    assert.match(html, /A test tagline/);
    assert.match(html, /Example Studio/);
    assert.doesNotMatch(html, /Actor 9/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TMDB person lookup returns a concise biography record", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(url, /\/person\/77\?/);
    return {
      ok: true,
      json: async () => ({ id: 77, name: "Actor Example", biography: "A short biography.", birthday: "1980-01-02", place_of_birth: "London", known_for_department: "Acting", profile_path: "/person.jpg" }),
    };
  };
  try {
    const person = await createTmdbClient({ token: "test-token" }).person(77);
    assert.equal(person.name, "Actor Example");
    assert.equal(person.biography, "A short biography.");
    assert.equal(person.source, "TMDB");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("movie search falls back to Wikidata when TMDB is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("/api/tmdb")) return { ok: false, status: 503 };
    if (String(url).includes("/api/metadata?query=")) {
      return { ok: true, json: async () => [{ id: "Q83495", title: "The Matrix", media_type: "wikidata" }] };
    }
    return {
      ok: true,
      json: async () => ({ tmdbId: "wikidata:Q83495", wikidataId: "Q83495", title: "The Matrix", metadataSource: "Wikidata" }),
    };
  };

  try {
    const client = createTmdbClient({ apiUrl: "https://movies.example.com" });
    const results = await client.search("The Matrix");
    assert.equal(results[0].media_type, "wikidata");
    const details = await client.details(results[0]);
    assert.equal(details.tmdbId, "wikidata:Q83495");
    assert.deepEqual(await client.providers(details), []);
    assert.ok(calls.some((url) => url.includes("/api/metadata?id=Q83495")));
    assert.equal(calls.some((url) => url.includes("watch/providers")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});