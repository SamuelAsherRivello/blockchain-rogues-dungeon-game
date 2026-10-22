# Proposal

## Why

The dungeon currently renders a sprite for nearly every blocked cell, producing dense wall fields even where the player cannot reach or see a room boundary. The verified `Tileset_Dungeon` Wang set provides a better authored presentation for walkable boundaries, while its unsupported patterns should be visible during development instead of silently receiving unrelated wall art.

## What Changes

- Apply the verified `Dungeon room walls` Wang footprint across the full generated dungeon, using tile 13 for interior walkable cells and the mapped wall-face/corner tiles for matching walkable boundary patterns.
- Render only walkable cells and matching Wang boundary cells; leave deep non-walkable interior cells empty so the game background shows through.
- Treat blocked cells touching walkable space by side or corner as the visible boundary for coverage and diagnostics, without placing unverified art on them.
- Skip tile rendering for any walkable boundary pattern absent from the verified Wang mapping.
- Add semi-transparent red 32-by-32 debug markers for skipped Wang cells in both the game view and minimap.
- Keep the binary dungeon map authoritative for collision, pathfinding, entity placement, saves, and seed determinism.
- Add renderer-neutral tests for Wang mask selection, sparse terrain output, unsupported markers, view consistency, and full-dungeon seeded behavior.

## Capabilities

### New Capabilities

- `full-dungeon-wang-rendering`: Defines sparse Wang-based dungeon presentation, unsupported-pattern diagnostics, and the distinction between walkable floor, authored boundary art, and empty deep walls.

### Modified Capabilities

- `world-map-rendering`: The game view and minimap must share sparse Wang terrain and unsupported-cell markers while preserving identical world coordinates and passive minimap behavior.

## Impact

- Affected renderer model: `cryptbound/src/content/world/WorldRender.js` and related Wang planning utilities.
- Affected Babylon Lite view: `cryptbound/src/content/BabylonWorld.jsx`, including a dynamic debug-marker texture and ordered terrain/debug layers.
- Affected tests: focused dungeon and renderer tests, plus one browser smoke check for the visible sparse dungeon.
- Existing `Tileset_Dungeon.tsx` Wang metadata and `cryptbound/documentation/dungeon-wang-mapping.md` become the source for the runtime local-ID mapping.
- No new runtime dependency or fallback renderer is required. Playwright adds useful evidence for the browser-visible sparse rendering; the broad suite remains for finalization.
