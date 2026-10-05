let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

function requestNominatim(url) {
  const request = nominatimQueue.then(async () => {
    const wait = 1000 - (Date.now() - lastNominatimRequestAt);
    if (wait > 0) await new Promise((resolve) => globalThis.setTimeout(resolve, wait));
    lastNominatimRequestAt = Date.now();
    return fetch(url, {
      headers: { Accept: "application/json" },
      signal: globalThis.AbortSignal.timeout(20_000),
    });
  });
  nominatimQueue = request.then(() => undefined, () => undefined);
  return request;
}

export function createTheatreClient() {
  return {
    async search(query) {
      const params = new URLSearchParams({ q: `${query} cinema`, format: "jsonv2", addressdetails: "1", limit: "6" });
      const response = await requestNominatim(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error("Theatre search failed");
      return response.json();
    },
    async nearby(latitude, longitude) {
      const radius = 15000;
      const latitudeDelta = radius / 111_320;
      const longitudeDelta = latitudeDelta / Math.max(Math.cos(latitude * Math.PI / 180), 0.01);
      const params = new URLSearchParams({
        q: "cinema",
        format: "jsonv2",
        addressdetails: "1",
        limit: "40",
        viewbox: [longitude - longitudeDelta, latitude + latitudeDelta, longitude + longitudeDelta, latitude - latitudeDelta].join(","),
        bounded: "1",
      });
      const response = await requestNominatim(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error("Nearby theatre search failed");
      const places = await response.json();
      return places.flatMap((place) => {
        const name = place.name;
        const placeLatitude = Number(place.lat);
        const placeLongitude = Number(place.lon);
        if (!name || place.type !== "cinema" || !Number.isFinite(placeLatitude) || !Number.isFinite(placeLongitude)) return [];
        const toRadians = (degrees) => degrees * Math.PI / 180;
        const latitudeDifference = toRadians(placeLatitude - latitude);
        const longitudeDifference = toRadians(placeLongitude - longitude);
        const distance = 6371 * 2 * Math.asin(Math.sqrt(
          Math.sin(latitudeDifference / 2) ** 2
          + Math.cos(toRadians(latitude)) * Math.cos(toRadians(placeLatitude)) * Math.sin(longitudeDifference / 2) ** 2,
        ));
        if (distance > radius / 1000) return [];
        return [{ name, distance, display_name: place.display_name }];
      }).sort((first, second) => first.distance - second.distance).slice(0, 30);
    },
  };
}
