# Spec Delta

## ADDED Requirements

### Requirement: Open a valid saved game directly from its URL
The game SHALL load a saved game directly when the URL contains exactly one valid slot value of `1`, `2`, or `3`, and SHALL preserve the existing menu flow for missing, malformed, or unavailable slot values.

#### Scenario: Valid slot deep link
- **WHEN** the URL contains `slot=1`, `slot=2`, or `slot=3` and that slot is readable
- **THEN** the game skips the saved-game menu and opens the selected campaign

#### Scenario: Invalid slot deep link
- **WHEN** the URL contains a slot value outside `1`, `2`, or `3`
- **THEN** the game shows the normal saved-game menu

#### Scenario: Empty selected slot
- **WHEN** the URL selects a valid slot that has no saved campaign
- **THEN** the game starts a new campaign in that slot using the URL seed when present
