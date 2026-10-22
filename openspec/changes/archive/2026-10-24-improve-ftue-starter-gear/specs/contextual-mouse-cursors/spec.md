# Spec Delta

## MODIFIED Requirements

### Requirement: Match world cursor to available intent
The main game view SHALL show a walking icon for reachable ground, a fighting icon for enemy targets when an attack-capable weapon is assigned, an interaction hand for usable objects including unopened breakable crates, a pushing hand for legal barrel pushes, and a forbidden icon for blocked actions. A detected enemy targeted without an assigned attack-capable weapon SHALL use the forbidden icon and black target-box feedback. Cursor feedback SHALL reflect legal action availability and SHALL not imply remote interaction.

#### Scenario: Hover an unopened crate
- **WHEN** the player hovers an unopened crate with a legal approach or adjacent bump interaction
- **THEN** the interaction cursor appears rather than the fighting cursor
- **AND** a crate with neither a legal approach nor adjacent interaction uses the forbidden cursor

#### Scenario: Hover an enemy
- **WHEN** the player hovers a target that can be approached and attacked with an assigned attack-capable weapon
- **THEN** the fighting cursor appears and interaction still requires legal tactical range

#### Scenario: Hover an enemy while unarmed
- **WHEN** the player hovers a detected enemy without an assigned attack-capable weapon
- **THEN** the forbidden cursor and black target box appear while distant movement toward the target remains available

#### Scenario: Hover a blocked push
- **WHEN** the player targets a barrel with no legal push
- **THEN** the forbidden cursor appears
