import fs from "node:fs/promises";

const token = process.env.TMDB_READ_TOKEN;
if (!token) throw new Error("TMDB_READ_TOKEN is required.");

async function tmdb(path) {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, { headers: { Authorization: `Bearer ${token}`, accept: "application/json" } });
  if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
  return response.json();
}

const today = new Date().toISOString().slice(0, 10);
const [upcoming, genreData] = await Promise.all([
  tmdb(`/movie/upcoming?language=en-US&region=IN&page=1`),
  tmdb(`/genre/movie/list?language=en-US`),
]);
const genres = new Map(genreData.genres.map((genre) => [genre.id, genre.name]));
const records = upcoming.results
  .filter((movie) => movie.release_date && movie.release_date >= today && movie.poster_path)
  .slice(0, 18)
  .map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    year: Number(movie.release_date.slice(0, 4)),
    poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : "",
    overview: movie.overview || "",
    genres: movie.genre_ids.map((id) => genres.get(id)).filter(Boolean),
    runtime: 0,
    tmdbRating: movie.vote_average || null,
    director: "",
    status: "upcoming",
    releaseDate: movie.release_date,
    platform: null,
    region: "IN",
    category: "English",
    languageLabel: "English",
    curatedNote: "Refreshed daily from TMDB upcoming releases for India.",
  }));

await fs.writeFile("public/data/upcoming.json", `${JSON.stringify(records, null, 2)}\n`);
console.log(`Refreshed ${records.length} upcoming titles.`);
