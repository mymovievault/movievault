const DATA_URL = "data/movies.json";

export async function loadFlatFile() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL} (${response.status})`);
  }
  return response.json();
}

export function downloadFlatFile(records) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "movies.json";
  link.click();
  URL.revokeObjectURL(url);
}
