const repository = process.env.GITHUB_REPOSITORY || "mymovievault/movievault";
const [owner, name] = repository.split("/");

async function githubRequest(path, options = {}, token = process.env.GITHUB_TOKEN) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...options.headers },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

export async function getMovieFile() {
  const file = await githubRequest(`/repos/${owner}/${name}/contents/data/movies.json`);
  return { sha: file.sha, records: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) };
}

export async function saveMovieFile(records, sha, message, token) {
  return githubRequest(`/repos/${owner}/${name}/contents/data/movies.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(records, null, 2)}\n`).toString("base64"), sha }),
  }, token);
}
