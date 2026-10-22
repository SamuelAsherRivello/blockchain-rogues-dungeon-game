# Spec Delta

## MODIFIED Requirements

### Requirement: Order world visuals through defined render passes
The game view SHALL render walkable terrain first and floor-attached decals second. Walls, props, pickups, stairs, barrels, enemies, and the player SHALL use the shared world-depth pass without a fixed sprite layer overriding their depth. The minimap SHALL derive matching world coordinates and mover positions without adopting game-view occlusion behavior. Terrain and wall entries SHALL be selected from the validated external dungeon tileset rule contract, and an unsupported Wang topology SHALL remain a diagnostic rather than being replaced by a nearest wall frame.

#### Scenario: Draw a floor trigger under a barrel
- **WHEN** an active floor trigger and its barrel share one tile
- **THEN** the trigger renders above walkable terrain and below the barrel, wall tiles, and characters

#### Scenario: Render matching world positions in both views
- **WHEN** the game view and minimap render a floor containing walls, a player, enemies, and a barrel
- **THEN** both views use the same world coordinates and presented mover positions for those entries

#### Scenario: Draw a floor beside a wall
- **WHEN** a wall tile and an adjacent walkable floor tile are visible
- **THEN** the floor remains behind the wall art without changing the depth order of a prop or character at that boundary

#### Scenario: Keep rule selection authoritative
- **WHEN** a terrain cell is rendered from a generated or fixture map
- **THEN** its local tile ID comes from the validated `tileset-dungeon.tsx` rule contract
- **AND** an unsupported signature produces the shared diagnostic behavior instead of a nearest-frame substitution
- **AND** supported production maps contain zero unresolved signatures and display no diagnostic overlays

## ADDED Requirements

### Requirement: Keep Wang presentation consistent across views
The game view and minimap SHALL consume the same resolved Wang role, local tile identity, and unsupported-topology diagnostic for each world coordinate.

#### Scenario: Compare a corner and side mapping
- **WHEN** a seeded fixture contains the corrected corner and repeated side roles
- **THEN** both views show the same tile-role identity at the same coordinate, scaled only by their view policy

### Requirement: Present only production dungeon artwork
The production game view and minimap SHALL contain no temporary diagnostic text, red unsupported-cell markers, construction grids, pivot markers, or guidelines. Supported dungeon boundaries SHALL remain complete and coherent. Diagnostic visualization SHALL require explicit developer opt-in.

#### Scenario: Open the normal dungeon route
- **WHEN** a supported seeded floor opens without debug query flags
- **THEN** the dungeon displays production atlas tiles with continuous walls, correct corners and joins, and no temporary overlays
- **AND** suppressing diagnostics without resolving missing tile roles does not satisfy acceptance

