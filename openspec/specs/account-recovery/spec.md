# account-recovery Specification

## Purpose
TBD - created by archiving change harden-and-polish-movie-vault. Update Purpose after archive.
## Requirements
### Requirement: Recoverable accounts
Users SHALL be able to change or reset a password without administrator database access.

#### Scenario: Password reset
- **WHEN** a user completes a valid reset flow
- **THEN** the old password stops working and the new password authenticates

### Requirement: Session expiry
Expired sessions SHALL be rejected and removable without exposing account data.

#### Scenario: Expired cookie
- **WHEN** an expired session is presented
- **THEN** protected API requests return unauthorized and the UI explains that sign-in is required

