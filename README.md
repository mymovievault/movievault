# Movie Vault

A personal film archive served by Vercel, with a static frontend, Vercel Functions API, and Neon/Postgres storage.

## Repository layout

- `public/`: browser-served HTML, CSS, JavaScript, images, and local fallback data
- `api/`: Vercel Functions and server-side API helpers
- `tests/`, `scripts/`, and `docs/`: project checks, maintenance tasks, and operating guidance

Vercel serves only `public/` as static content. API functions stay outside that directory and are not exposed as downloadable source files.

## Data and features

Each movie record combines TMDB-style metadata with personal status, rating, watched date, notes, and tags. `public/data/movies.json` is a local preview and seed backup. Live accounts, sessions, movies, and watchlists are stored in Neon/Postgres through the API. Each movie belongs to its signed-in username.

The app supports movie and series search, watched and watching shelves, wishlists, named watchlists, upcoming releases, profiles, account recovery, and admin approval of new accounts. New registrations begin as pending requests; the `abilash9007` account is promoted to admin by the database migration.

TMDB credentials belong in Vercel environment variables, never in browser configuration. TMDB is the primary title search and metadata provider; when it fails or has no matches, the API searches Wikidata as an open-data fallback. Wikidata results are marked by source, may have less complete metadata, and do not include TMDB provider availability. OMDb is not enabled because its published CC BY-NC license is not appropriate for a potentially commercial site without separate permission. The app uses same-origin API routes on deployed domains; local static preview mode is retained for development.

## Vercel setup

Connect this repository to Vercel and add a Neon/Postgres integration. Configure these environment variables:

- `POSTGRES_URL`: supplied by the Neon integration
- `SESSION_SECRET`: a long random value used to sign session-related data
- `TMDB_READ_TOKEN`: restricted TMDB API Read Access Token for server-side requests
- `FRONTEND_ORIGIN`: production site origin, such as `https://movies.example.com`

The Vercel build runs `npm run check` and serves `public/`; functions are deployed from `api/`. Configure the production custom domain in Vercel. Preview deployments use their own deployment origin and API.

Seed a new database from the repository backup with:

```sh
npx vercel env pull .env.local --environment=production
set -a; . .env.local; set +a
node scripts/seed-database.mjs
```

The seeded records use `abilash9007` as their owner. Create that username first to see the existing library; other accounts start with their own lists.

The Upcoming page loads current TMDB data through the API. It checks Tamil, Telugu, Malayalam, Kannada, Hindi, and English upcoming movies for India, plus a separate trending section. `public/data/upcoming.json` is a local static fallback; live refreshes use `TMDB_READ_TOKEN` on Vercel.

## Local development

For the frontend's read-only local preview, serve the public directory:

```sh
cd public
python3 -m http.server 8000
```

Open `http://localhost:8000`. Browser API calls and account mutations require a deployed Vercel environment; do not use `file://` because browsers block local fetches.

## Checks and operations

Install dependencies and run the project checks:

```sh
npm ci
npm run check
```

Vercel runs the same check before building. Run public deployment smoke checks with:

```sh
SMOKE_URL=https://movies.example.com node scripts/smoke.mjs
```

See [docs/operations.md](docs/operations.md) for database backup, restore, and production recovery guidance. `.github/workflows/cleanup-vercel.yml` removes only failed Vercel deployments; it requires the `VERCEL_TOKEN` repository secret scoped to the `moviebuff` team.
