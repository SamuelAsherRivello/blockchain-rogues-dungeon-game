# contextual-mouse-cursors Specification

## Purpose

Communicate the action available at the mouse target through consistent world cursors and familiar UI affordances.

## Requirements

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

### Requirement: Retain UI cursor semantics
UI controls SHALL retain pointer, help, grab/grabbing, and disabled cursor semantics appropriate to their action. An active drag or UI target SHALL take precedence over world hover. The minimap SHALL remain passive and SHALL not display a world action cursor.

#### Scenario: Drag equipment over an invalid target
- **WHEN** a dragged item cannot be dropped at the pointer location
- **THEN** the cursor communicates an invalid drop rather than world walking

#### Scenario: Hover help or a utility selector
- **WHEN** the pointer is over a help trigger or utility selector
- **THEN** the corresponding help or normal control cursor appears

### Requirement: Preserve target and path feedback
Context cursors SHALL coexist with the reticle, enemy tooltip, and existing mouse-only dotted path without intercepting input. Unsupported custom cursor images SHALL fall back to native cursor shapes.

#### Scenario: Move the pointer within one cell
- **WHEN** the pointer changes pixels within the same target cell
- **THEN** cursor movement does not require a new navigation search solely for that pixel change

### Requirement: Respect player enemy detection
World enemy tooltip and combat-cursor disclosure SHALL respect player detection. Undetected enemies SHALL still participate in authoritative collision, awareness, and Battle activation; a red Battle border SHALL not by itself reveal their identity or position.

#### Scenario: Battle begins with an undetected enemy
- **WHEN** an enemy triggers Battle while outside player detection
- **THEN** the Battle border appears without exposing that enemy's tooltip or identifying combat cursor

#### Scenario: Lose detection while hovering an enemy
- **WHEN** a hovered enemy leaves Perception range or loses line of sight
- **THEN** its tooltip and identifying combat cursor clear on the detection update, without requiring pointer movement
- **AND** hover feedback no longer discloses that enemy's identity or position
