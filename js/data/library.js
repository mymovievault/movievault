export function createLibrary(records) {
  let entries = structuredClone(records);

  return {
    all() {
      return structuredClone(entries);
    },
    find(tmdbId) {
      return structuredClone(entries.find((entry) => entry.tmdbId === Number(tmdbId)));
    },
    add(record) {
      const entry = { ...record, tmdbId: record.tmdbId || Date.now() };
      entries = [entry, ...entries];
      return structuredClone(entry);
    },
    remove(tmdbId) {
      entries = entries.filter((entry) => entry.tmdbId !== Number(tmdbId));
    },
    update(tmdbId, changes) {
      entries = entries.map((entry) => entry.tmdbId === Number(tmdbId) ? { ...entry, ...changes } : entry);
      return this.find(tmdbId);
    },
    stats() {
      const watched = entries.filter((entry) => entry.status === "watched");
      return {
        total: entries.length,
        watched: entries.filter((entry) => entry.status === "watched" || entry.status === "watching").length,
        wishlist: entries.filter((entry) => entry.status === "wishlist").length,
        minutes: watched.reduce((sum, entry) => sum + (entry.runtime || 0), 0),
        averageRating: watched.length ? watched.reduce((sum, entry) => sum + (entry.rating || 0), 0) / watched.length : 0,
      };
    },
  };
}
