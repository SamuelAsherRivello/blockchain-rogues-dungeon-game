# Spec Delta

## ADDED Requirements

### Requirement: Publish structured drop outcomes
The game SHALL publish structured events for committed drops, rejected drops, and recollection of dropped objects, including item identity, quantity, source, destination or world position, outcome, and game time.

#### Scenario: Publish a committed drop
- **WHEN** a Sword is dropped into the world
- **THEN** subscribers receive one committed event identifying Sword, its source, and settled world position

#### Scenario: Publish a rejected drop
- **WHEN** no valid nearby cell exists for a requested drop
- **THEN** subscribers receive a rejected event and the source item remains unchanged
