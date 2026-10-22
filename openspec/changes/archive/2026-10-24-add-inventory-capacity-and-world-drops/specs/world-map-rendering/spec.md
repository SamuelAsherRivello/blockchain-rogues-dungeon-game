# Spec Delta

## ADDED Requirements

### Requirement: Render dropped object flights and settled sprites
The world renderer SHALL draw dropped equipment, abilities, consumables, and capacity items during their parabolic flight and after they settle, using the same world-depth ordering and visibility rules as other pickups.

#### Scenario: Render a dropped weapon
- **WHEN** a weapon is thrown from the player to an adjacent cell
- **THEN** its item-specific sprite follows the arc and then remains visible at the settled cell

#### Scenario: Render a dropped ability
- **WHEN** an ability is present in the world
- **THEN** its distinct representation is visible in both the game view and minimap at matching coordinates
