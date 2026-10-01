# Movie Vault

A framework-free personal film archive designed for GitHub Pages.

## Data model

The app reads `data/movies.json` as its canonical flat file. Each record keeps TMDB-style metadata beside personal information such as status, rating, date, notes, and tags. The repository interface in `js/data/library.js` keeps the UI independent from the storage mechanism, so the flat file can later become GitHub JSON or a database.

The add form can search TMDB for movies and series. To enable it on GitHub Pages, add a repository Actions secret named `TMDB_READ_TOKEN` under **Settings > Secrets and variables > Actions**, containing your TMDB API Read Access Token. The Pages workflow injects it into `js/config.js` during deployment. This token is visible in a GitHub Pages site, so use a restricted read-only token and never use a server credential with write permissions. Without a token, manual entry remains available.

GitHub Pages is read-only from the browser. For shared persistence, deploy the included `api/` functions to Vercel's free tier and set `MOVIE_API_URL` in `js/config.js` to that deployment URL. The API uses GitHub OAuth and commits new records to `data/movies.json`; the GitHub write token stays in Vercel environment variables. Until `MOVIE_API_URL` is configured, the app remains read-only and the **Export JSON** action is available as a manual fallback.

## Vercel backend

Import this repository into Vercel and configure these environment variables:

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: a GitHub OAuth App whose callback is `https://YOUR-VERCEL-DOMAIN/api/auth/callback`
- `GITHUB_TOKEN`: a fine-grained token with Contents read/write access to this repository
- `GITHUB_REPOSITORY`: `mymovievault/movievault`
- `GITHUB_ALLOWED_USER`: your GitHub username
- `SESSION_SECRET`: a long random value
- `APP_URL`: your Vercel deployment URL
- `FRONTEND_URL`: your GitHub Pages URL

Then set `MOVIE_API_URL` to the Vercel URL and redeploy the Pages site.

## Run locally

Because browsers block `fetch()` from `file://` pages, serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Quality checks

Install dependencies and run the full local gate with:

```sh
npm install
npm run check
```

This runs ESLint, the Node test suite for the library data layer, JavaScript syntax checks, and static asset/JSON validation. GitHub Pages runs the same gate before deploying.

## Deploy

Push the repository to GitHub, enable GitHub Actions as the Pages source, and set the repository Pages source to **GitHub Actions**. `.github/workflows/pages.yml` deploys the root folder on pushes to `main`.
