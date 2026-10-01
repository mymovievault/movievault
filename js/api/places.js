export function createTheatreClient() {
  return {
    async search(query) {
      const params = new URLSearchParams({ q: `${query} cinema`, format: "jsonv2", addressdetails: "1", limit: "6" });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Theatre search failed");
      return response.json();
    },
  };
}
