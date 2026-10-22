# Spec Delta

## ADDED Requirements

### Requirement: Preserve normal turn simulation during deterministic inspection
Deterministic URL reconstruction and repaired-map inspection SHALL preserve the existing collision, pathfinding, accepted-action, enemy-phase, and dungeon-level rules.

#### Scenario: Move on a deterministic generated floor
- **WHEN** the player accepts a legal move after opening a seeded world URL
- **THEN** the same one-turn movement and enemy-phase rules apply as in an ordinary campaign

#### Scenario: Inspect a repaired floor
- **WHEN** the player moves on a validated repaired map
- **THEN** collision and pathfinding use the repaired walkability data while time and enemy actions follow the normal turn rules
