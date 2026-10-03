import test from "node:test";
import assert from "node:assert/strict";
import { genreMovies, genrePage } from "../public/js/pages/genre.js";
import { personPage } from "../public/js/pages/person.js";

test("genre results include unique library and owned-list matches only", () => {
  const library = [{ tmdbId: 1, title: "Vault drama", genres: ["Drama"] }];
  const lists = [
    { is_owner: true, items: [{ tmdbId: 1, title: "Duplicate", genres: ["Drama"] }, { tmdbId: 2, title: "List drama", genres: ["Drama"] }] },
    { is_owner: false, items: [{ tmdbId: 3, title: "Shared drama", genres: ["Drama"] }] },
  ];
  const matches = genreMovies("drama", library, lists);
  assert.deepEqual(matches.map((movie) => movie.title), ["Vault drama", "List drama"]);
  assert.match(genrePage("Drama", matches), /2 matching titles/);
});

test("TMDB person brief renders biography and career facts", () => {
  const html = personPage({
    name: "Actor Example",
    source: "TMDB",
    biography: "A short biography.",
    knownForDepartment: "Acting",
    birthDate: "1980-01-02",
    placeOfBirth: "London",
    profile: "https://image.tmdb.org/t/p/w500/person.jpg",
  });
  assert.match(html, /Actor Example/);
  assert.match(html, /A short biography/);
  assert.match(html, /Born 1980-01-02/);
  assert.match(html, /London/);
});