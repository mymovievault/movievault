## ADDED Requirements

### Requirement: Account approval
New accounts SHALL remain pending until an administrator approves them.

#### Scenario: Pending signup
- **WHEN** a user submits a valid registration
- **THEN** the system confirms the request and prevents sign-in until approval

### Requirement: Ownership isolation
Authenticated users SHALL only see their own private library and lists unless explicitly shared.

#### Scenario: Private library access
- **WHEN** one user requests another user's private records
- **THEN** the API returns no private records and does not mutate them
