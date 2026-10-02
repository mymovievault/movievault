## Why

Movie Vault is now a real multi-user application with Postgres persistence, local accounts, sharing, TMDB integrations, and production deployments. Before expanding the feature set further, it needs a professional reliability and security baseline so user content is safe, account access is recoverable, abusive requests are controlled, and the desktop/mobile experience remains consistent.

## What Changes

- Escape all user- and provider-derived values before inserting them into HTML templates to prevent stored XSS.
- Add rate limiting and request validation to authentication, import, TMDB proxy, list, and movie endpoints.
- Add account password change/reset support and clear session expiration handling.
- Add authorization integration tests for private libraries, shared read-only lists, admin actions, and mutation ownership.
- Add deployment smoke checks for auth, database, TMDB proxy, and critical production routes.
- Improve empty, loading, error, confirmation, and destructive-action states across the app.
- Add pagination or incremental rendering for large libraries while preserving responsive desktop/mobile layouts.
- Add database migration discipline, backups, and an audit trail for approvals, sharing, deletions, and account changes.
- Add TMDB attribution and document third-party data usage and privacy expectations.

## Capabilities

### New Capabilities

- `security-hardening`: Safe rendering, validation, rate limiting, session handling, and abuse controls.
- `account-recovery`: Password changes, reset flow, session expiry, and recovery messaging.
- `production-health`: Post-deploy smoke checks, runtime diagnostics, and operational failure reporting.
- `library-performance`: Pagination or incremental loading for large personal libraries.
- `audit-and-backup`: Database backup guidance and auditable administrative mutations.
- `local-accounts`: Account approval, authentication, sessions, and ownership boundaries.
- `watchlists-and-sharing`: Named watchlists, owner mutations, and read-only sharing.
- `movie-library`: Movie metadata, filters, responsive views, and personal library behavior.

### Modified Capabilities
 
No existing OpenSpec capabilities are present in this repository; the requirements below are introduced as new capabilities for this baseline.

## Impact

- Frontend templates and responsive CSS under `js/` and `css/`.
- Vercel API functions under `api/` and Postgres schema/query helpers.
- GitHub Actions and Vercel deployment checks.
- Test suite and new integration-test fixtures.
- Runtime environment variables, database migrations, backup procedures, and user-facing documentation.
