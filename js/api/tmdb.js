const IMAGE_BASE = "https://image.tmdb.org/t/p/";

export function imageUrl(path, size = "w500") {
  if (!path) return "";
  return path.startsWith("http") ? path : `${IMAGE_BASE}${size}${path}`;
}

export function createTmdbClient({ token } = {}) {
  const request = (path) => fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  }).then((response) => {
    if (!response.ok) throw new Error("TMDB request failed");
    return response.json();
  });

  return {
    async search(query) {
      if (!token) return [];
      const data = await request(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`);
      return data.results.filter((item) => item.media_type === "movie" || item.media_type === "tv");
    },
    async details(item) {
      const data = await request(`/${item.media_type}/${item.id}?append_to_response=credits&language=en-US`);
      const director = data.credits?.crew?.find((person) => person.job === "Director");
      return {
        tmdbId: data.id,
        title: data.title || data.name,
        year: Number((data.release_date || data.first_air_date || "").slice(0, 4)) || null,
        poster: imageUrl(data.poster_path),
        backdrop: imageUrl(data.backdrop_path, "w1280"),
        overview: data.overview || "",
        genres: data.genres?.map((genre) => genre.name) || [],
        runtime: data.runtime || data.episode_run_time?.[0] || 0,
        tmdbRating: data.vote_average || null,
        director: director?.name || "",
      };
    },
  };
}
