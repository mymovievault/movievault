## ADDED Requirements

### Requirement: Movie metadata integrity
Movie records SHALL preserve TMDB identity and personal fields without allowing unescaped content to execute.

#### Scenario: Metadata update
- **WHEN** a user updates a movie record
- **THEN** its TMDB identity and personal fields remain associated with the correct owner and list

### Requirement: Accurate library statistics
Library statistics SHALL count records and runtime using the same status scope shown to the user.

#### Scenario: Watched time
- **WHEN** watched records have runtime metadata
- **THEN** the displayed time total equals the sum of those runtimes
