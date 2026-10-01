const DATA_URL = "data/movies.json";
export async function loadFlatFile(apiUrl = "") {
  const response = await fetch(apiUrl || DATA_URL, { cache: "no-store", credentials: apiUrl ? "include" : "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL} (${response.status})`);
  }
  return response.json();
}

export async function getSession(apiUrl) {
  const response = await fetch(`${apiUrl}/api/auth/me`, { cache: "no-store", credentials: "include" });
  return response.json();
}

export async function logout(apiUrl) {
  await fetch(`${apiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function saveMovie(record, apiUrl) {
  if (!apiUrl) throw new Error("Configure MOVIE_API_URL before saving movies.");
  const response = await fetch(apiUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save movie.");
  return result;
}

