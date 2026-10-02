// Add a restricted TMDB API Read Access Token for online title search.
export const TMDB_READ_TOKEN = "";
const isVercelHost = typeof location !== "undefined" && location.hostname.endsWith(".vercel.app");
export const MOVIE_API_URL = isVercelHost ? location.origin : "";
