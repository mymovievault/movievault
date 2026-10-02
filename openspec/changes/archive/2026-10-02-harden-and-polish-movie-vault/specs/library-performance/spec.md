## ADDED Requirements

### Requirement: Scalable library rendering
The library SHALL render large collections without blocking interaction or creating uncontrolled page overflow.

#### Scenario: Large collection
- **WHEN** a user has hundreds of records
- **THEN** filtering and navigation remain responsive on desktop and mobile

### Requirement: Responsive controls
Library filters and cards SHALL provide usable controls at desktop and mobile breakpoints.

#### Scenario: Mobile filtering
- **WHEN** a user filters on a narrow viewport
- **THEN** controls fit or scroll intentionally and visible counts match visible cards
