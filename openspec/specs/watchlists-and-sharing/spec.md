# watchlists-and-sharing Specification

## Purpose
TBD - created by archiving change harden-and-polish-movie-vault. Update Purpose after archive.
## Requirements
### Requirement: Owner-scoped watchlists
Users SHALL create, view, update, and delete only their own watchlist content.

#### Scenario: Unauthorized mutation
- **WHEN** a user attempts to mutate another user's list
- **THEN** the API rejects the request and changes no record

### Requirement: Read-only sharing
Owners SHALL share a selected list with approved users as read-only.

#### Scenario: Shared list viewer
- **WHEN** an approved viewer opens a shared list
- **THEN** they can view its records but cannot edit, delete, or reshare them

