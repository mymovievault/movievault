const baseUrl = (process.env.SMOKE_URL || "").replace(/\/$/, "");
if (!baseUrl) throw new Error("Set SMOKE_URL to the deployed Movie Vault URL.");

async function check(path, expectedStatuses) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (!expectedStatuses.includes(response.status)) throw new Error(`${path} returned ${response.status}; expected ${expectedStatuses.join(" or ")}`);
  return response;
}

const html = await check("/", [200]);
if (!(await html.text()).includes("Movie Vault")) throw new Error("Homepage did not contain the Movie Vault marker.");
await check("/api/auth/me", [401]);
await check("/api/movies", [401]);
await check("/api/upcoming", [200, 401, 502]);
console.log(`Smoke checks passed for ${baseUrl}`);