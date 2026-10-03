// Keep TMDB credentials on the API server; deployed search uses same-origin routes.
export const TMDB_READ_TOKEN = "";
const isLocalPreview = typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname);
export const MOVIE_API_URL = typeof location !== "undefined" && !isLocalPreview ? location.origin : "";
