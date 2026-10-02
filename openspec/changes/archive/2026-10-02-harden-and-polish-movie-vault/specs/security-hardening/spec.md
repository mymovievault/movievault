## ADDED Requirements

### Requirement: Safe dynamic rendering
The application SHALL escape user- and provider-derived values before inserting them into HTML.

#### Scenario: Malicious movie note
- **WHEN** a record contains HTML or script markup
- **THEN** the rendered card and detail view display it as text and execute no script

### Requirement: Request throttling
The API SHALL rate-limit authentication, TMDB proxy, import, and mutation endpoints.

#### Scenario: Repeated login attempts
- **WHEN** a client exceeds the configured login threshold
- **THEN** further attempts receive a throttled response for a bounded period
