# Proposal

## Why

The repaired seed-17 map exposed two problems in the current dungeon presentation model: corridor diagnostics are being treated as missing art instead of generated floor-and-wall geometry, and the exported Tiled layer names do not communicate which cells are walkable or blocked. Corridors need a width-aware floor mask with a continuous rendered wall boundary, while deep unreachable space should remain empty so the background shows through.

## What Changes

- Rename the exported tile layers to `Grounds` and `Walls`.
- Define `Grounds` as rendered walkable floor and `Walls` as rendered nonwalkable wall cells.
- Rename the object layers to `Pickups` and `Decorations`.
- Generate horizontal and vertical corridors with an explicit width of one or more tiles.
- Connect corridors to room edge sockets away from room corners.
- Derive a wall boundary wherever corridor or room floor meets nonwalkable space, including corridor sides, bends, and exposed ends.
- Keep deep nonwalkable interior cells empty and unrendered.
- Select Wang floor and wall variants from the verified dungeon tileset; retain diagnostics only for genuinely unsupported geometry.
- Import repaired maps by layer role rather than assuming that every nonzero tile in one layer is walkable.
- Preserve the repaired-map workflow and make the layer contract reusable for future Tiled-authored dungeon repairs.

## Capabilities

### New Capabilities

- `layered-dungeon-maps`: Defines the durable Tiled layer contract for grounds, walls, pickups, and decorations, including walkability and rendering semantics.
- `width-aware-dungeon-corridors`: Defines deterministic corridor widths, room edge sockets, and continuous wall boundaries for generated dungeon connections.

### Modified Capabilities

- `world-map-rendering`: The shared game and minimap render model must consume separate grounds and walls while keeping deep unreachable space empty and preserving coordinate consistency.

## Impact

- Affected generation: `cryptbound/src/game/dungeon.js` and corridor/room geometry helpers.
- Affected Tiled serialization and repair import: `cryptbound/src/game/tiled-map.js`, debug fixtures, and map-repair documentation.
- Affected renderer model and Babylon Lite layers: `cryptbound/src/content/world/WorldRender.js` and `cryptbound/src/content/BabylonWorld.jsx`.
- Affected tests: deterministic corridor geometry, layer-role validation, repaired-map import, Wang wall boundaries, and one focused browser rendering check. No new runtime dependency is expected.
