const DATA_URL = "data/movies.json";
export async function loadFlatFile(apiUrl = "") {
  const response = await fetch(apiUrl || DATA_URL, { cache: "no-store", credentials: apiUrl ? "include" : "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL} (${response.status})`);
  }
  return response.json();
}

export async function saveMovie(record, apiUrl) {
  if (!apiUrl) throw new Error("Configure MOVIE_API_URL before saving movies.");
  const response = await fetch(apiUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save movie.");
  return result;
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
