# Spec Delta

## ADDED Requirements

### Requirement: Persist dropped item state
Campaign saves SHALL preserve each dropped object's identity, type, quantity, world coordinate, and any active settled state, as well as the presence of Extra Space and its effective capacity effect.

#### Scenario: Reload beside a dropped item
- **WHEN** a campaign is saved with a dropped Sword on the current floor and then reloaded
- **THEN** the Sword remains at the same world cell and can be collected

#### Scenario: Reload with Extra Space
- **WHEN** a campaign is saved while Extra Space is carried and then reloaded
- **THEN** the same effective capacity is restored
