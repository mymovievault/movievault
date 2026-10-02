## Context

Movie Vault is a static frontend on Vercel backed by Vercel Functions and Neon/Postgres. It has local accounts, admin approval, owner-scoped movies, named watchlists, read-only sharing, TMDB proxying, and responsive CSS. The current test suite is primarily unit/syntax/static validation; production smoke coverage and security hardening are incomplete.

## Goals / Non-Goals

**Goals:**

- Prevent stored XSS and unsafe dynamic HTML rendering.
- Protect authentication and mutation endpoints from abuse.
- Make account recovery and session expiry usable.
- Verify ownership and sharing boundaries with integration tests.
- Keep large libraries usable on desktop and mobile.
- Make production failures observable and backups repeatable.

**Non-Goals:**

- Replacing Vercel, Neon, TMDB, or the current local-account model.
- Adding collaborative editing; shared lists remain read-only.
- Introducing a client-side state framework or a build-heavy frontend stack.

## Decisions

1. **Use a shared escaping utility for templates.** This is preferred over replacing the framework because the app is intentionally framework-free and the risk is concentrated at HTML interpolation points.
2. **Keep authorization server-side.** Every list/movie mutation will resolve the session owner and verify list ownership; client controls are convenience only.
3. **Use bounded API rate limiting.** Rate limits will be lightweight and compatible with serverless execution, with stricter thresholds for auth and TMDB proxy routes.
4. **Add integration tests against a disposable database or mocked repository boundary.** Unit tests alone cannot prove owner isolation or approval transitions.
5. **Use incremental rendering/pagination for large libraries.** This avoids loading hundreds of cards into the DOM at once while preserving the current visual language.
6. **Add smoke checks after deployment.** Checks will verify public HTML, auth status, database-backed API status, and TMDB proxy status without exposing secrets.

## Risks / Trade-offs

- [Rate limits behind serverless instances] -> Keep limits conservative and document that they are abuse controls, not billing enforcement.
- [Cookie restrictions across domains] -> Prefer same-origin Vercel hosting and test credentials on desktop/mobile browsers.
- [Migration failure] -> Use idempotent migrations, run them before dependent queries, and retain rollback SQL.
- [Escaping regressions] -> Add XSS fixture tests for titles, notes, tags, usernames, and list names.
- [Free-tier pressure from smoke checks] -> Keep checks to a small number of requests per deployment.

## Migration Plan

1. Add specs, tests, and escaping/rate-limit helpers without changing data.
2. Add idempotent database migrations for audit and recovery fields.
3. Deploy to Vercel and run smoke checks.
4. Enable pagination and UX changes after backend checks pass.
5. Retain the previous Ready Vercel deployment for rollback until smoke checks pass.

## Open Questions

- Which password reset channel should be used: email provider or admin-generated reset links?
- How long should audit events and expired sessions be retained?
- Should the admin dashboard include user deletion or only approval/status controls?
