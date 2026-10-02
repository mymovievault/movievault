## 1. Security Baseline

- [x] 1.1 Add a shared HTML escaping utility and replace unsafe template interpolation.
- [x] 1.2 Add endpoint validation and bounded rate limiting for auth, TMDB, import, and mutation routes.
- [x] 1.3 Add XSS and authorization integration fixtures.

## 2. Account Reliability

- [x] 2.1 Add password change and recovery flow.
- [x] 2.2 Add explicit session expiry handling and user-facing recovery messages.
- [x] 2.3 Add tests for pending, approved, rejected, and resubmitted accounts.

## 3. Library Performance And UX

- [x] 3.1 Add incremental rendering or pagination for large libraries.
- [x] 3.2 Add loading, empty, error, confirmation, and undo states for mutations.
- [x] 3.3 Validate desktop and mobile layouts at representative viewport sizes.

## 4. Operations

- [x] 4.1 Add post-deploy smoke checks for HTML, auth, database, and TMDB proxy health.
- [x] 4.2 Add idempotent audit and backup schema migrations.
- [x] 4.3 Document backup, restore, retention, and third-party attribution procedures.

## 5. Verification And Release

- [x] 5.1 Run the full local quality gate and integration tests.
- [x] 5.2 Deploy to Vercel and verify smoke checks.
- [x] 5.3 Confirm the previous production deployment remains available for rollback.
