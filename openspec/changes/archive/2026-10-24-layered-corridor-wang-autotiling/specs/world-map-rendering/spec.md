# Spec Delta

## MODIFIED Requirements

### Requirement: Keep world views geometrically consistent
The game view and minimap SHALL derive terrain, walls, object coordinates, actor coordinates, linked puzzle-object states, and discovered-map visibility from the same active realm. During sub-grid movement presentation, both views SHALL use the same interpolated player, actor, and pushable-barrel coordinates. The game-view camera SHALL frame from the interpolated player coordinate in Center, Deadzone, and Screen modes while retaining each mode's existing framing policy. The minimap SHALL provide a simplified low-resolution representation of discovered realm knowledge rather than unrelated artwork. Generated levels, exported editable maps, and repaired maps SHALL use one canonical Grounds and Walls tile-layer result for their visible terrain.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** grounds, walls, player, and exit occupy matching map coordinates despite different scale and detail

#### Scenario: Present character movement
- **WHEN** a player or visible enemy travels between committed grid cells
- **THEN** the game view and minimap show that character at the same interpolated coordinate throughout the movement

#### Scenario: Stage enemy movement
- **WHEN** a resolved turn is presenting a visible enemy movement
- **THEN** the game view and minimap show that enemy at the same interpolated coordinate throughout its movement

#### Scenario: Retarget character movement
- **WHEN** a later accepted action changes a character's destination before its movement ends
- **THEN** both views show the same new interpolation from the character's current displayed coordinate

#### Scenario: Follow interpolated player movement
- **WHEN** the player moves or retargets during a 250 millisecond movement presentation
- **THEN** Center, Deadzone, and Screen camera modes each frame from the player's current interpolated coordinate while preserving their established centering, deadzone, or screen-page behavior

#### Scenario: Show a linked puzzle set
- **WHEN** both views render a Floor Trigger Door Barrel Set
- **THEN** the barrel, floor trigger, and door occupy matching map coordinates in both views
- **AND** each view distinguishes active from inactive trigger and open from closed door states

#### Scenario: Interpolate a pushed barrel
- **WHEN** a player pushes a barrel between committed grid cells
- **THEN** the game view and minimap show that barrel at the same interpolated coordinate throughout its 250 millisecond movement
- **AND** the trigger and door update their state from the committed object-set position

#### Scenario: Show a corridor boundary consistently
- **WHEN** a corridor floor meets nonwalkable space
- **THEN** the game view and minimap show the same wall boundary at the same world coordinates

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale grounds, walls, terrain, or actors

#### Scenario: Enter a standalone prefab
- **WHEN** the player enters a teleport prefab and its iris transition completes
- **THEN** both views render the prefab's terrain and player from the same active prefab context with no stale dungeon-floor geometry

#### Scenario: Hide an undiscovered region
- **WHEN** part of the active realm has not been discovered
- **THEN** neither the game view nor minimap exposes its terrain, objects, or enemies through ordinary play presentation

#### Scenario: Render a generated level and its editable copy
- **WHEN** a generated level is rendered in the game and exported as an editable Tiled map
- **THEN** the same walkable cells and wall cells appear in both representations, Walls use the same resolved frames, and Grounds uses the single approved walkable tile

#### Scenario: Resolve an authored repaired map
- **WHEN** a repaired map supplies valid Grounds and Walls layers
- **THEN** runtime rendering preserves those authored tile frames while using the same coordinates and semantic walkability
