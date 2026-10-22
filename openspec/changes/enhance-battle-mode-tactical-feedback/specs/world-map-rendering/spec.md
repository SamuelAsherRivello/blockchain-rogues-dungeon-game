# Spec Delta

## ADDED Requirements

### Requirement: Show a binary tactical area for detected enemies
During Battle, the game view SHALL divide visible world cells into exactly two presentation zones. The tactical area SHALL include the player cell and the union of filled inclusive rectangles from the player to each detected enemy within Battle warning range. Each rectangle SHALL extend one full grid row upward before union, with its sides and bottom unchanged. Overlap SHALL not increase brightness.

#### Scenario: One detected enemy
- **WHEN** Battle is active with one detected qualifying enemy
- **THEN** the player cell, enemy cell, and rectilinear engagement area between them belong to the tactical area
- **AND** one full row above the rectangle is included to protect character artwork
- **AND** all other visible cells belong to the non-tactical area

#### Scenario: Multiple detected enemies
- **WHEN** Battle is active with multiple detected qualifying enemies
- **THEN** the tactical area is the union of each player-to-enemy engagement area
- **AND** overlapping areas are rendered as one combined tactical area

#### Scenario: No detected enemy
- **WHEN** Battle is active but no qualifying enemy is detected
- **THEN** no enemy-specific tactical area is shown
- **AND** only the player cell and the cell directly above it belong to the tactical area
- **AND** the presentation does not reveal hidden enemy location information

### Requirement: Preserve world geometry and interaction
The tactical-area presentation SHALL be a visual overlay over the existing world rendering and SHALL not change terrain geometry, camera coordinates, minimap geometry, collision, route selection, reticles, or pointer input.

#### Scenario: Interact inside tactical area
- **WHEN** the player moves or selects a cell within the tactical area
- **THEN** existing movement, combat, and mouse interaction rules remain unchanged

#### Scenario: Reframe or zoom the world
- **WHEN** the camera or world Zoom changes during Battle
- **THEN** the tactical area reprojects from the same world coordinates without changing its membership
