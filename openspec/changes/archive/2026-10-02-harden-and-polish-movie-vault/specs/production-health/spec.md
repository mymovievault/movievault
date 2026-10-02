## ADDED Requirements

### Requirement: Post-deploy smoke checks
Every production deployment SHALL verify authentication, database access, TMDB proxy access, and the primary page response.

#### Scenario: Healthy deployment
- **WHEN** deployment completes
- **THEN** smoke checks confirm the primary URL and protected API health before reporting success

### Requirement: Actionable runtime errors
Runtime failures SHALL produce safe user-facing messages and diagnostic server logs without secrets.

#### Scenario: Database unavailable
- **WHEN** the database cannot be reached
- **THEN** the UI shows a recovery message and the server log records a non-sensitive error
