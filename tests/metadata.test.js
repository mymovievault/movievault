import test from "node:test";
import assert from "node:assert/strict";
import metadata, { normalizeEntity, normalizePerson, searchResults } from "../api/_lib/routes/metadata.js";
import { personPage } from "../public/js/pages/person.js";
import { movieModal } from "../public/js/components/movie-modal.js";

test("Wikidata fallback search excludes non-film results", () => {
  const results = searchResults({ search: [
    { id: "Q1", label: "The Matrix", description: "1999 science fiction film" },
    { id: "Q2", label: "The Matrix", description: "music album" },
  ] });
  assert.deepEqual(results.map((item) => item.id), ["Q1"]);
  assert.equal(results[0].media_type, "wikidata");
});

test("Wikidata entities normalize into the saved movie shape", () => {
  const entity = {
    id: "Q83495",
    labels: { en: { value: "The Matrix" } },
    descriptions: { en: { value: "1999 science fiction film" } },
    claims: {
      P577: [{ mainsnak: { datavalue: { value: { time: "+1999-03-31T00:00:00Z" } } } }],
      P2047: [{ mainsnak: { datavalue: { value: { amount: "+136" } } } }],
      P57: [
        { mainsnak: { datavalue: { value: { id: "Q099" } } } },
        { mainsnak: { datavalue: { value: { id: "Q100" } } } },
      ],
      P136: [{ mainsnak: { datavalue: { value: { id: "Q200" } } } }],
      P161: [
        { mainsnak: { datavalue: { value: { id: "Q300" } } }, qualifiers: { P1545: [{ datavalue: { value: "2" } }] } },
        { mainsnak: { datavalue: { value: { id: "Q301" } } }, qualifiers: { P1545: [{ datavalue: { value: "1" } }] } },
      ],
    },
  };
  const movie = normalizeEntity(entity, { Q100: "Director", Q200: "Science fiction", Q300: "Later actor", Q301: "First actor" });
  assert.equal(movie.tmdbId, "wikidata:Q83495");
  assert.equal(movie.year, 1999);
  assert.equal(movie.runtime, 136);
  assert.equal(movie.director, "Director");
  assert.deepEqual(movie.directorPerson, { id: "Q100", name: "Director", profile: "", source: "Wikidata" });
  assert.deepEqual(movie.genres, ["Science fiction"]);
  assert.deepEqual(movie.cast.map((person) => person.name), ["First actor", "Later actor"]);
  assert.equal(movie.poster, "");
  assert.equal(movie.cast[0].source, "Wikidata");
  const html = movieModal({ ...movie, status: "watched" });
  assert.match(html, /href="#\/person\/wikidata\/Q301"/);
  assert.match(html, /href="#\/person\/wikidata\/Q100"/);
  assert.match(html, /href="#\/genre\/Science%20fiction"/);
});

test("Wikidata person details render a brief with occupation and source credit", () => {
  const person = normalizePerson({
    id: "Q123",
    labels: { en: { value: "Example Actor" } },
    descriptions: { en: { value: "British actor" } },
    claims: {
      P569: [{ mainsnak: { datavalue: { value: { time: "+1980-01-02T00:00:00Z" } } } }],
      P19: [{ mainsnak: { datavalue: { value: { id: "Q84" } } } }],
      P106: [{ mainsnak: { datavalue: { value: { id: "Q33999" } } } }],
    },
  }, { Q84: "London", Q33999: "actor" });
  const html = personPage(person);
  assert.match(html, /Example Actor/);
  assert.match(html, /British actor/);
  assert.match(html, /London/);
  assert.match(html, /Wikidata/);
});

test("Wikidata detail endpoint resolves entity labels and returns normalized metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.match(options.headers["User-Agent"], /^MovieVault\/1\.0/);
    const request = new URL(url);
    if (request.searchParams.get("props") === "labels|descriptions|claims") {
      return {
        ok: true,
        json: async () => ({ entities: { Q42: {
          id: "Q42",
          labels: { en: { value: "Example Film" } },
          descriptions: { en: { value: "A feature film" } },
          claims: {
            P577: [{ mainsnak: { datavalue: { value: { time: "+2020-04-05T00:00:00Z" } } } }],
            P57: [
              { mainsnak: { datavalue: { value: { id: "Q099" } } } },
              { mainsnak: { datavalue: { value: { id: "Q100" } } } },
            ],
          },
        } } }),
      };
    }
    return { ok: true, json: async () => ({ entities: { Q100: { labels: { en: { value: "Example Director" } } } } }) };
  };
  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };

  try {
    await metadata({ method: "GET", headers: { origin: "https://movies.example.com", "x-forwarded-for": "test-client" }, query: { id: "Q42" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.title, "Example Film");
    assert.equal(response.body.director, "Example Director");
    assert.equal(response.body.tmdbId, "wikidata:Q42");
  } finally {
    globalThis.fetch = originalFetch;
  }
});