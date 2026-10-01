# Movie Vault

A framework-free personal film archive designed for GitHub Pages.

## Data model

The app uses Neon/Postgres as its live data store through the Vercel API. `data/movies.json` remains the seed and export backup. Each record keeps TMDB-style metadata beside personal information such as status, rating, date, notes, and tags. The repository interface in `js/data/library.js` keeps the UI independent from the storage mechanism.

The add form can search TMDB for movies and series. To enable it on GitHub Pages, add a repository Actions secret named `TMDB_READ_TOKEN` under **Settings > Secrets and variables > Actions**, containing your TMDB API Read Access Token. The Pages workflow injects it into `js/config.js` during deployment. This token is visible in a GitHub Pages site, so use a restricted read-only token and never use a server credential with write permissions. Without a token, manual entry remains available.

GitHub Pages is the frontend only. The Vercel API writes directly to Postgres, so saves are immediate and do not require GitHub login or a Pages rebuild. The endpoint is intentionally public for this personal app; keep the Vercel URL private if abuse becomes a concern. Until `MOVIE_API_URL` is configured, the app remains read-only and the **Export JSON** action is available as a manual fallback.

## Vercel backend

Connect this repository to Vercel, add a Neon/Postgres storage integration, and configure these environment variables:

- `POSTGRES_URL`: created by the Neon/Postgres integration
- `FRONTEND_ORIGIN`: your GitHub Pages origin without the path, for example `https://mymovievault.github.io`

Seed a new database from the repository backup with:

```sh
npx vercel env pull .env.local --environment=production
set -a; . .env.local; set +a
node scripts/seed-database.mjs
```

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
