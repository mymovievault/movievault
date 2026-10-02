const IMAGE_BASE = "https://image.tmdb.org/t/p/";

export function imageUrl(path, size = "w500") {
  if (!path) return "";
  return path.startsWith("http") ? path : `${IMAGE_BASE}${size}${path}`;
}

export function createTmdbClient({ token, apiUrl } = {}) {
  const request = (path) => fetch(token ? `https://api.themoviedb.org/3${path}` : `${apiUrl}/api/tmdb?path=${encodeURIComponent(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}`, accept: "application/json" } : { accept: "application/json" },
    credentials: "include",
  }).then((response) => {
    if (!response.ok) throw new Error("TMDB request failed");
    return response.json();
  });

  return {
    async search(query) {
      if (!token && !apiUrl) return [];
      const data = await request(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`);
      return data.results.filter((item) => item.media_type === "movie" || item.media_type === "tv");
    },
    async details(item) {
      const data = await request(`/${item.media_type}/${item.id}?append_to_response=credits&language=en-US`);
      const director = data.credits?.crew?.find((person) => person.job === "Director");
      return {
        tmdbId: data.id,
        mediaType: item.media_type,
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
    async providers(item, region = "IN") {
      if (!token || !item.mediaType) return [];
      const data = await request(`/${item.mediaType}/${item.tmdbId}/watch/providers`);
      const regionData = data.results?.[region] || {};
      return [
        ...(regionData.flatrate || []).map((provider) => ({ ...provider, availability: "streaming" })),
        ...(regionData.free || []).map((provider) => ({ ...provider, availability: "free" })),
        ...(regionData.rent || []).map((provider) => ({ ...provider, availability: "rent" })),
        ...(regionData.buy || []).map((provider) => ({ ...provider, availability: "buy" })),
      ].filter((provider, index, providers) => providers.findIndex((item) => item.provider_id === provider.provider_id) === index);
    },
  };
}
