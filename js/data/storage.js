const DATA_URL = "data/movies.json";
const UPCOMING_URL = "data/upcoming.json";
export async function loadFlatFile(apiUrl = "") {
  const response = await fetch(apiUrl || DATA_URL, { cache: "no-store", credentials: apiUrl ? "include" : "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL} (${response.status})`);
  }
  return response.json();
}

export async function loadUpcoming(apiUrl = "") {
  const response = await fetch(apiUrl ? `${apiUrl}/api/upcoming` : UPCOMING_URL, { cache: "no-store", credentials: apiUrl ? "include" : "same-origin" });
  if (!response.ok) throw new Error(`Could not load upcoming titles (${response.status})`);
  return response.json();
}

export async function getSession(apiUrl) {
  const response = await fetch(`${apiUrl}/api/auth/me`, { cache: "no-store", credentials: "include" });
  const result = await response.json();
  return { ...result, sessionExpired: result.sessionExpired || false };
}

export async function loadApprovedUsers(apiUrl, search) {
  const query = new URLSearchParams({ action: "approved-users", q: search });
  const response = await fetch(`${apiUrl}/api/lists?${query}`, { cache: "no-store", credentials: "include" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load users.");
  return result;
}

export async function logout(apiUrl) {
  await fetch(`${apiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
}

async function authRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not update your account.");
  return result;
}

export function loadProfile(apiUrl) {
  return authRequest(`${apiUrl}/api/auth/profile`, { cache: "no-store" });
}

export function saveProfile(apiUrl, profile) {
  return authRequest(`${apiUrl}/api/auth/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export function changePassword(apiUrl, currentPassword, newPassword) {
  return authRequest(`${apiUrl}/api/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function saveMovie(record, apiUrl) {
  if (!apiUrl) throw new Error("Configure MOVIE_API_URL before saving movies.");
  const response = await fetch(apiUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save movie.");
  return result;
}

export async function loadWatchlists(apiUrl) {
  const response = await fetch(`${apiUrl}/api/lists`, { cache: "no-store", credentials: "include" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load watchlists.");
  return result;
}

async function changeMovie(method, tmdbId, changes, apiUrl) {
  const response = await fetch(apiUrl, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tmdbId, changes }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not update movie.");
  return result;
}

export function updateMovie(tmdbId, changes, apiUrl) {
  return changeMovie("PATCH", tmdbId, changes, apiUrl);
}

export function deleteMovie(tmdbId, apiUrl) {
  return changeMovie("DELETE", tmdbId, {}, apiUrl);
}

