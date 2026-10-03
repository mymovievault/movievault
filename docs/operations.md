# Operations

## Schema and audit data

The Vercel API initializes schema objects with `CREATE TABLE IF NOT EXISTS` and adds columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. The initialization is safe to run repeatedly and creates `password_reset_tokens`, `audit_events`, and the shared `media_catalog`/`media_people` tables. Existing movie and watchlist metadata is copied into the catalogs before the owner/list rows are compacted to references plus user-specific fields. Provider aliases deduplicate exact TMDB, Wikidata, and IMDb identifiers; records without a shared identifier are intentionally not fuzzy-matched by title.

Before deploying catalog schema changes, export a production backup and test the repeatable backfill against a disposable Neon branch or local Postgres instance with copies of the legacy `movies` and `watchlist_items` tables. Verify row counts, catalog joins, duplicate provider aliases, library privacy, and watchlist contents before promoting. Keep the previous Ready Vercel deployment available while applying schema changes.

## Replacing the production database without losing data

A Neon branch is a point-in-time copy of the Postgres database contents and schema used by the app, not a copy of just the movie tables. It includes users, password hashes, sessions, reset tokens, movies, watchlists, shares, audit events, and database objects. It does not copy Vercel project settings or environment variables.

1. Create a disposable Neon branch from the current production branch. Set its connection string as `POSTGRES_URL` for Vercel Preview only; keep the production value unchanged.
2. Deploy a Preview build and make a first API request. The idempotent `ready()` setup applies the catalog backfill to this branch. Verify authentication, movie records, lists/shares, admin access, and that user-specific fields remain intact. Compare table counts before and after; only rows proven to be the same title by provider IDs should merge.
3. For cutover, briefly disable writes to the current production database, create a fresh branch from the latest production snapshot, update Vercel Production `POSTGRES_URL` to that branch, deploy, and verify reads/authentication before re-enabling writes.
4. Keep the original production branch and a separate backup untouched. Reverting the connection string is only lossless before writes resume on the new branch; after that, new writes must be replayed or retained before rollback.

Do not run `scripts/seed-database.mjs` on a cloned branch: it is for bootstrapping an empty database from the repository's limited seed file and is unnecessary when the full production data is already copied.

## Backup and restore

Create an encrypted custom-format export from the production connection string outside the repository:

```sh
pg_dump --format=custom --file="movievault-$(date +%Y%m%d-%H%M).dump" "$DATABASE_URL"
```

Store the dump in an access-controlled backup location, never in Git or a browser download directory. Verify it with `pg_restore --list backup.dump`. Restore to a new disposable database first, then use `pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" backup.dump` during an approved recovery window. Keep daily backups for 7 days and monthly backups for 12 months, subject to the storage provider's policy.

## Recovery and smoke checks

An administrator issues a one-time reset token from the Admin page. The token expires after 30 minutes, is stored only as a SHA-256 hash, and is invalidated after use. Run the public smoke checks after a successful deployment:

```sh
SMOKE_URL=https://your-deployment.example.com node scripts/smoke.mjs
```

The smoke check does not require credentials and does not print cookies, tokens, database URLs, or TMDB credentials. Authenticated mutation and approval paths remain covered by the integration fixtures and should be exercised against a disposable database before production changes.

## Third-party attribution

Movie metadata, poster images, release dates, and upcoming/trending data are supplied by TMDB. Movie Vault is not endorsed or certified by TMDB. Keep the TMDB attribution visible in the product footer or About surface, use a restricted read-only API token, and do not expose a server-side token in client configuration. Remove or refresh cached provider data when a user requests deletion.