# Spec Delta

## Purpose

Provides a deterministic, inspectable representation of generated dungeon floors so map-generation defects can be reproduced, repaired in Tiled, and retained as regression fixtures without changing normal gameplay.

## ADDED Requirements

### Requirement: Reproduce a requested generated floor
The debug workflow SHALL reconstruct a requested world and level from explicit URL metadata, including the seed and generator version used for the reconstruction.

#### Scenario: Open a deterministic level URL
- **WHEN** a user opens a URL containing valid `world`, `level`, and `seed` values with `debug-fix-map-autotiled=1`
- **THEN** the game loads the corresponding generated floor without requiring a new random seed

### Requirement: Export the active floor as a Tiled map
The debug workflow SHALL export the active floor's terrain, walkability, entities, player, exit, dimensions, seed, world, level, coordinate convention, and generator version as a Tiled-compatible map.

#### Scenario: Download a generated floor
- **WHEN** the user requests an export while map-fix mode is enabled
- **THEN** the downloaded map contains the current in-memory floor and its reproduction metadata

### Requirement: Load a repaired Tiled floor explicitly
The debug workflow SHALL accept an explicitly selected repaired Tiled map only when map-fix mode is enabled and SHALL validate its dimensions, layers, metadata, and required gameplay coordinates before rendering it.

#### Scenario: Open a repaired map
- **WHEN** a valid repaired map is supplied through the map-fix URL workflow
- **THEN** the game and minimap render that map using the normal coordinate and Wang-placement rules

#### Scenario: Reject an invalid repaired map
- **WHEN** a supplied repaired map is missing required data or has incompatible dimensions
- **THEN** the game reports a clear repair-map error and does not replace the active campaign floor

### Requirement: Keep repair diagnostics opt-in
The debug export, import, and diagnostic controls SHALL remain unavailable during ordinary URLs without `debug-fix-map-autotiled=1`.

#### Scenario: Open a normal game URL
- **WHEN** the URL omits the map-fix flag
- **THEN** normal save-menu and gameplay behavior remains unchanged and repair controls are hidden
