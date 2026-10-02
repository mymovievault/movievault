# Movie Vault

A framework-free personal film archive designed for GitHub Pages.

## Data model

The app uses Neon/Postgres as its live data store through the Vercel API. `data/movies.json` remains a seed backup for development and migration. Each record keeps TMDB-style metadata beside personal information such as status, rating, date, notes, and tags. The repository interface in `js/data/library.js` keeps the UI independent from the storage mechanism.

The add form can search TMDB for movies and series. To enable it on GitHub Pages, add a repository Actions secret named `TMDB_READ_TOKEN` under **Settings > Secrets and variables > Actions**, containing your TMDB API Read Access Token. The Pages workflow injects it into `js/config.js` during deployment. This token is visible in a GitHub Pages site, so use a restricted read-only token and never use a server credential with write permissions. Without a token, manual entry remains available.

GitHub Pages is the frontend only. The Vercel API stores users, sessions, and movies in Postgres. Each movie belongs to the signed-in username, so accounts see only their own lists. Saves are immediate and do not require GitHub access. Until `MOVIE_API_URL` is configured, the local static build remains a read-only preview.

New account registrations start as pending requests. The `abilash9007` account is promoted to admin by the database migration and can approve or reject requests from the **Admin** page. Approved users can then sign in and manage their own library. Sharing can later be added on top of the existing owner-scoped records.

## Vercel backend

Connect this repository to Vercel, add a Neon/Postgres storage integration, and configure these environment variables:

- `POSTGRES_URL`: created by the Neon/Postgres integration
- `SESSION_SECRET`: a long random value used for session cookies
- `FRONTEND_ORIGIN`: your GitHub Pages origin without the path, for example `https://mymovievault.github.io`

Seed a new database from the repository backup with:

```sh
npx vercel env pull .env.local --environment=production
set -a; . .env.local; set +a
node scripts/seed-database.mjs
```

The seeded records use `abilash9007` as their owner. Create that username first to see the existing library; other usernames start with their own empty lists.

The Upcoming page loads current TMDB data through the Vercel API at runtime. It checks Tamil, Telugu, Malayalam, Kannada, Hindi, and English upcoming movies for India, plus a separate Most talked about trending section. It does not commit release changes to GitHub. `data/upcoming.json` remains only as a local static fallback; configure `TMDB_READ_TOKEN` in Vercel for the live feed.

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

`.github/workflows/cleanup-vercel.yml` also runs on every `main` push and manually, removing only Vercel deployments in the `ERROR` state. It preserves all Ready deployments and the production alias. Add a repository secret named `VERCEL_TOKEN` scoped to the `moviebuff` team for this workflow.
