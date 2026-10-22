# Proposal

## Why

The game needs two distinct ways to use authored prefab content: stamping a structure into a generated dungeon floor, and teleporting into a standalone prefab map. The existing prefab code covers only generation-time stamping, while the existing stair transition is specialized around changing dungeon levels. A generalized prefab-navigation model will let the player enter `player-home.tmx` through a visible world object while preserving a clear distinction between embedded and standalone content.

## What Changes

- Define prefab stamping as a generation-time operation that applies a prefab footprint to an existing floor and connects it to the generated route.
- Add a standalone teleport-prefab destination model, initially targeting `player-home.tmx`.
- Add a new object-layer teleport-arrow entry object drawn above the floor rather than represented as terrain.
- Place one teleport arrow on every generated dungeon level at a deterministic legal position.
- Support `leveltest=1` as an alias for the existing level-one test setting; when enabled, place the level-one World 1 teleport arrow within 50 grid cells of the level-one starting point for reliable testing.
- When `leveltest=1` is not enabled, place one teleport arrow per level at a deterministic pseudo-random legal position.
- Trigger a bidirectional iris transition between the dungeon arrow and a return arrow in `player-home.tmx`.
- Place arrows in both the generated dungeon level and the player-home prefab; spawn the player in a random viable, walkable, unoccupied cardinal-adjacent cell rather than on the arrow cell.
- Preserve the dungeon level identity while the player is inside the prefab and return to the originating dungeon level through the home arrow.
- Keep the current stair-based dungeon-level transition behavior intact while generalizing shared teleport-transition concepts.

## Capabilities

### New Capabilities

- `prefab-navigation`: Defines prefab stamping, standalone teleport-prefab entry, teleport-arrow objects, authored prefab entrances, and the initial bidirectional player-home transition.

### Modified Capabilities

- `world-map-rendering`: The active rendered realm may be a standalone prefab while preserving consistent object coordinates and Pixel Perfect presentation.
- `campaign-saves`: The active prefab context and player position must remain valid across autosave and resume while the player is inside a teleport prefab.

## Impact

- Affected procedural generation and prefab code under `rogues-dungeon/src/systems/procedural/`, including placement reservations, deterministic placement, route validation, and prefab metadata.
- Affected game-domain actions and events under `rogues-dungeon/src/game/` and the procedural action system, including a new teleport-prefab entry path distinct from `enter-stairs`.
- Affected Babylon Lite world rendering and object presentation so teleport arrows render above the floor and prefab maps can become the active view.
- Affected persistence normalization and save tests if active prefab context is persisted.
- New or updated focused Node tests for placement, deterministic generation, prefab entry, and persistence; one focused muted Playwright check is useful for the iris transition and browser-visible arrow-to-prefab flow, with full browser coverage reserved for finalization.
