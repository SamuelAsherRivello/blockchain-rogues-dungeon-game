# Spec Delta

## MODIFIED Requirements

### Requirement: Keep world views geometrically consistent
The game view and minimap SHALL derive terrain, walls, object coordinates, actor coordinates, and linked puzzle-object states from the same active realm, including a standalone teleport prefab. During sub-grid movement presentation, both views SHALL use the same interpolated player, actor, and pushable-barrel coordinates. The game-view camera SHALL frame from the interpolated player coordinate in Center, Deadzone, and Screen modes while retaining each mode's existing framing policy. The minimap SHALL provide a simplified low-resolution representation of the active realm rather than unrelated artwork.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** walls, player, and exit occupy matching map coordinates despite different scale and detail

#### Scenario: Present character movement
- **WHEN** a player or visible enemy travels between committed grid cells
- **THEN** both views show that character at the same interpolated coordinate throughout the movement

#### Scenario: Stage enemy movement
- **WHEN** a resolved turn is presenting a visible enemy movement
- **THEN** both views show that enemy at the same interpolated coordinate throughout the movement

#### Scenario: Retarget character movement
- **WHEN** a later accepted action changes a character's destination before its movement ends
- **THEN** both views show the same new interpolation from the character's current displayed coordinate

#### Scenario: Follow interpolated player movement
- **WHEN** a player moves or retargets during a 250 millisecond movement presentation
- **THEN** Center, Deadzone, and Screen camera modes each frame from the player's current interpolated coordinate while preserving their established centering, deadzone, or screen-page behavior

#### Scenario: Show a linked puzzle set
- **WHEN** both views render a Floor Trigger Door Barrel Set
- **THEN** the barrel, floor trigger, and door occupy matching map coordinates in both views
- **AND** each view distinguishes active from inactive trigger and open from closed door states

#### Scenario: Interpolate a pushed barrel
- **WHEN** a player pushes a barrel between committed grid cells
- **THEN** both views show that barrel at the same interpolated coordinate throughout the 250 millisecond movement
- **AND** the trigger and door update their state from the committed object-set position

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale terrain or actors

#### Scenario: Enter a standalone prefab
- **WHEN** the player enters a teleport prefab and its iris transition completes
- **THEN** both views render the prefab's terrain and player from the same active prefab context with no stale dungeon-floor geometry

### Requirement: Order world visuals through defined render passes
The game view SHALL render walkable terrain first and floor-attached decals second. Walls, props, pickups, stairs, teleport arrows, barrels, enemies, and the player SHALL use the shared world-depth pass without a fixed sprite layer overriding their depth. The minimap SHALL derive matching world coordinates and mover positions without adopting game-view occlusion behavior.

#### Scenario: Draw a floor trigger under a barrel
- **WHEN** an active floor trigger and its barrel share one tile
- **THEN** the trigger renders above walkable terrain and below the barrel, wall tiles, and characters

#### Scenario: Render matching world positions in both views
- **WHEN** the game view and minimap render a floor containing walls, a player, enemies, a barrel, and a teleport arrow
- **THEN** both views use the same world coordinates and presented mover positions for those entries

#### Scenario: Draw a floor beside a wall
- **WHEN** a wall tile and an adjacent walkable floor tile are visible
- **THEN** the floor remains behind the wall art without changing the depth order of a prop or character at that boundary

#### Scenario: Keep rule selection authoritative
- **WHEN** a terrain cell is rendered from a generated or fixture map
- **THEN** its local tile ID comes from the validated `tileset-dungeon.tsx` rule contract
- **AND** an unsupported signature produces the shared diagnostic behavior instead of a nearest-frame substitution
- **AND** supported production maps contain zero unresolved signatures and display no diagnostic overlays

