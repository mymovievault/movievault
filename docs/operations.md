# Operations

## Schema and audit data

The Vercel API initializes schema objects with `CREATE TABLE IF NOT EXISTS` and adds columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. The initialization is safe to run repeatedly and creates `password_reset_tokens` and `audit_events` before dependent queries run. Audit rows record the actor, action, target, metadata, and server timestamp for approvals, rejections, password changes/recovery, sharing, deletion, and movie/list mutations.

Before changing schema SQL, test against a disposable Neon branch or local Postgres instance. Keep the previous Ready Vercel deployment available while applying schema changes.

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