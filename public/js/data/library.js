export function findByTmdbId(records, tmdbId) {
  const entry = records.find((record) => String(record.tmdbId) === String(tmdbId));
  return entry ? structuredClone(entry) : undefined;
}

export function createLibrary(records) {
  let entries = structuredClone(records);

  return {
    all() {
      return structuredClone(entries);
    },
    find(tmdbId) {
      return findByTmdbId(entries, tmdbId);
    },
    add(record) {
      const entry = { ...record, tmdbId: record.tmdbId || Date.now() };
      const existingIndex = entries.findIndex((item) => String(item.tmdbId) === String(entry.tmdbId));
      entries = existingIndex < 0 ? [entry, ...entries] : entries.map((item, index) => index === existingIndex ? entry : item);
      return structuredClone(entry);
    },
    remove(tmdbId) {
      entries = entries.filter((entry) => String(entry.tmdbId) !== String(tmdbId));
    },
    update(tmdbId, changes) {
      entries = entries.map((entry) => String(entry.tmdbId) === String(tmdbId) ? { ...entry, ...changes } : entry);
      return this.find(tmdbId);
    },
    stats() {
      const watched = entries.filter((entry) => entry.status === "watched");
      const viewed = entries.filter((entry) => entry.status === "watched" || entry.status === "watching");
      const rated = watched.filter((entry) => Number.isFinite(Number(entry.rating)) && Number(entry.rating) > 0);
      return {
        total: entries.length,
        watched: entries.filter((entry) => entry.status === "watched" || entry.status === "watching").length,
        wishlist: entries.filter((entry) => entry.status === "wishlist").length,
        minutes: viewed.reduce((sum, entry) => sum + (entry.runtime || 0), 0),
        averageRating: rated.length ? rated.reduce((sum, entry) => sum + Number(entry.rating), 0) / rated.length : 0,
      };
    },
  };
}
