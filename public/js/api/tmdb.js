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
      try {
        const data = await request(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`);
        const matches = data.results.filter((item) => item.media_type === "movie" || item.media_type === "tv");
        if (matches.length) return matches;
      } catch {}
      if (!apiUrl) return [];
      const response = await fetch(`${apiUrl}/api/metadata?query=${encodeURIComponent(query)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Movie metadata search failed");
      return response.json();
    },
    async details(item) {
      if (item.media_type === "wikidata") {
        const response = await fetch(`${apiUrl}/api/metadata?id=${encodeURIComponent(item.id)}`, { credentials: "include" });
        if (!response.ok) throw new Error("Wikidata details request failed");
        return response.json();
      }
      const data = await request(`/${item.media_type}/${item.id}?append_to_response=credits&language=en-US`);
      const director = data.credits?.crew?.find((person) => person.job === "Director");
      return {
        tmdbId: data.id,
        mediaType: item.media_type,
        title: data.title || data.name,
        year: Number((data.release_date || data.first_air_date || "").slice(0, 4)) || null,
        releaseDate: data.release_date || data.first_air_date || null,
        poster: imageUrl(data.poster_path),
        backdrop: imageUrl(data.backdrop_path, "w1280"),
        overview: data.overview || "",
        tagline: data.tagline || "",
        genres: data.genres?.map((genre) => genre.name) || [],
        runtime: data.runtime || data.episode_run_time?.[0] || 0,
        tmdbRating: data.vote_average || null,
        director: director?.name || "",
        directorPerson: director ? {
          id: director.id,
          name: director.name,
          profile: imageUrl(director.profile_path, "w185"),
          source: "TMDB",
        } : null,
        cast: data.credits?.cast?.slice(0, 8).map((person) => ({
          id: person.id,
          name: person.name,
          character: person.character || "",
          profile: imageUrl(person.profile_path, "w185"),
          source: "TMDB",
        })) || [],
        productionCompanies: data.production_companies?.map((company) => company.name).filter(Boolean) || [],
      };
    },
    async person(id, source = "TMDB") {
      if (source.toLowerCase() === "wikidata") {
        if (!apiUrl) throw new Error("Wikidata profiles require the metadata API.");
        const response = await fetch(`${apiUrl}/api/metadata?personId=${encodeURIComponent(id)}`, { credentials: "include" });
        if (!response.ok) throw new Error("Wikidata person details request failed");
        return response.json();
      }
      const data = await request(`/person/${encodeURIComponent(id)}?language=en-US`);
      return {
        id: String(data.id),
        name: data.name || "",
        source: "TMDB",
        biography: data.biography || "",
        birthDate: data.birthday || "",
        deathDate: data.deathday || "",
        placeOfBirth: data.place_of_birth || "",
        knownForDepartment: data.known_for_department || "",
        profile: imageUrl(data.profile_path),
      };
    },
    async providers(item, region = "IN") {
      if ((!token && !apiUrl) || !item.mediaType || item.metadataSource === "Wikidata") return [];
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
