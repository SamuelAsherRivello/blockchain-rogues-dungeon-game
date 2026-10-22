# Proposal

## Why

The procedural dungeon is difficult to diagnose when a generated floor has incorrect connectivity, wall placement, or Wang autotiling. A deterministic URL and a Tiled round-trip would let us reproduce one saved world, inspect the exact generated cells, repair the map visually, and turn the repaired result into a regression fixture.

## What Changes

- Add deterministic deep links using `world`, `level`, `slot`, `seed`, and `mute` parameters.
- When `slot` is `1`, `2`, or `3`, load that saved game directly and skip the saved-game menu; invalid or missing values keep the existing menu flow.
- Add the specific `debug-fix-map-autotiled=1` flag for map-generation diagnostics and repair tools.
- Export the active generated level as a Tiled map containing terrain, walkability, entities, player and exit coordinates, and generation metadata.
- Support loading a repaired Tiled map through a controlled debug URL for comparison and renderer validation.
- Preserve the original binary simulation map, save behavior, seed determinism, collision, pathfinding, and turn rules unless an explicitly imported repaired map is active.
- Record generator version, world, level, seed, dimensions, and coordinate conventions in exported map metadata so fixtures remain reproducible after generator changes.

## Capabilities

### New Capabilities

- `world-generation-debugging`: Deterministic world inspection, Tiled export/import, repair metadata, and map-generation diagnostics.

### Modified Capabilities

- `world-map-rendering`: The renderer accepts an explicitly loaded repaired map while keeping game and minimap geometry consistent.
- `campaign-saves`: Valid URL-selected saved games can resume directly without displaying the slot menu.
- `dungeon-turns`: A deterministic world/level/seed selection can reconstruct the requested generated floor for inspection without changing normal turn simulation.

## Impact

- Affected game entry and URL parsing in `cryptbound/src/game/`.
- Affected procedural generation and world serialization in `cryptbound/src/game/dungeon.js` and related world modules.
- Affected Babylon world/minimap rendering and Tiled asset handling.
- New debug export/import utilities, Tiled fixtures, focused Node tests, and a seeded muted browser smoke check.
- No production dependency or network service is required; debug behavior remains opt-in through the specific URL flag.
