import { setCors } from "../cors.js";

const LANGUAGES = [["ta", "Tamil"], ["te", "Telugu"], ["ml", "Malayalam"], ["kn", "Kannada"], ["hi", "Hindi"], ["en", "English"]];

export default async function upcoming(request, response) {
  setCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  try {
    const token = process.env.TMDB_READ_TOKEN;
    if (!token) throw new Error("Configure TMDB_READ_TOKEN in Vercel.");
    const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const requestJson = (path) => fetch(`https://api.themoviedb.org/3${path}`, { headers }).then((result) => {
      if (!result.ok) throw new Error("TMDB upcoming request failed");
      return result.json();
    });
    const [genreData, ...languageData] = await Promise.all([
      requestJson("/genre/movie/list?language=en-US"),
      ...LANGUAGES.map(([code]) => requestJson(`/discover/movie?language=en-US&region=IN&with_original_language=${code}&primary_release_date.gte=${today}&primary_release_date.lte=${endDate}&sort_by=popularity.desc&page=1`)),
    ]);
    const genres = new Map(genreData.genres.map((genre) => [genre.id, genre.name]));
    const records = languageData.flatMap((data, index) => data.results.slice(0, 5).map((movie) => mapMovie(movie, genres, LANGUAGES[index][1], LANGUAGES[index][1])));
    const trending = await requestJson("/trending/movie/week?language=en-US");
    records.push(...trending.results.slice(0, 8).map((movie) => mapMovie(movie, genres, "Most talked about", "Trending")));
    const unique = records.filter((movie, index, all) => all.findIndex((item) => item.tmdbId === movie.tmdbId) === index);
    return response.status(200).json(unique);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}

function mapMovie(movie, genres, category, languageLabel) {
  return {
    tmdbId: movie.id,
    mediaType: "movie",
    metadataSource: "TMDB",
    externalIds: { tmdb: String(movie.id) },
    title: movie.title,
    year: Number((movie.release_date || "").slice(0, 4)) || null,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : "",
    overview: movie.overview || "",
    genres: movie.genre_ids?.map((id) => genres.get(id)).filter(Boolean) || [],
    runtime: 0,
    tmdbRating: movie.vote_average || null,
    director: "",
    status: "upcoming",
    releaseDate: movie.release_date || null,
    platform: null,
    region: "IN",
    category,
    languageLabel,
    curatedNote: `Current TMDB selection: ${category}.`,
  };
}
