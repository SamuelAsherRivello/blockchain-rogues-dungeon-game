# Design

## Context

The current floor generator stores a binary map where `0` is walkable and `1` is blocked, while the Tiled export exposes `Walkability` and `Terrain` names that do not communicate their visual and collision roles. The current room connector carves a one-cell L path between room centers, which creates unsupported Wang boundary diagnostics. The renderer already has a shared world model for the game view and minimap and a verified local Wang mapping for the dungeon tileset.

## Goals / Non-Goals

**Goals:**

- Keep the binary simulation map authoritative while deriving presentation masks for `Grounds` and `Walls`.
- Make corridor width a deterministic generation input and keep room sockets away from corners.
- Render every exposed ground-to-blocked boundary with verified wall art while omitting deep unreachable space.
- Export and import the canonical four-layer Tiled contract.
- Keep the game view and minimap on one coordinate model.

**Non-Goals:**

- Adding a new renderer or replacing Babylon Lite.
- Treating arbitrary repaired tile IDs as gameplay semantics.
- Supporting unrestricted Wang masks that are absent from the verified tileset mapping.
- Changing combat, movement rules, save slots, or seed determinism beyond the floor geometry they consume.

## Decisions

### Keep simulation and presentation masks separate

The generated floor continues to store a binary walkability map for collision, pathfinding, entities, and saves. A presentation pass derives a ground mask from walkable cells and a wall mask from blocked cells orthogonally adjacent to ground. This keeps wall decoration from accidentally making a cell traversable. A repaired Tiled map imports the two masks from `Grounds` and `Walls` independently and rejects overlaps.

### Use edge sockets and swept corridors

Each room exposes candidate sockets on its top, right, bottom, and left edges, excluding corner cells. The connector selects a deterministic pair based on the seeded room order, chooses a horizontal or vertical route for each segment, and sweeps a rectangle of the requested width around the centerline. The corridor is clipped to the map and merged with rooms before walls are derived. This is preferred over center-to-center carving because the socket expresses where the opening belongs and the sweep expresses width directly.

### Derive walls from adjacency, then resolve Wang roles

For every blocked cell adjacent to a ground cell, compute the local ground-neighbor mask and select a verified wall role. Ground boundary cells use the existing verified floor Wang mapping. Unsupported masks remain empty and produce a diagnostic entry; the renderer never substitutes an unrelated tile. Room openings and corridor intersections suppress the boundary edge that would otherwise close the passage.

### Make Tiled layers explicit

Serialization emits `Grounds` and `Walls` tile layers and `Pickups` and `Decorations` object layers. The imported floor treats a nonzero `Grounds` GID as a ground candidate and a nonzero `Walls` GID as a wall candidate, then validates overlap and required markers. The old names are not used for new exports; a migration path can be added later only if a concrete legacy map requires it.

### Preserve sparse rendering

The renderer receives only ground entries, wall-boundary entries, and recognized objects. Deep blocked interiors produce no sprite. Both the main view and minimap consume the same entries and diagnostics, with only scale and camera framing differing.

### Browser evidence

Playwright adds useful evidence for the browser-visible result because the change affects corridor width, wall visibility, layer naming, and sparse background rendering. Apply should run one focused seeded map-fix smoke check after renderer integration; full browser and Node coverage remains a finalization concern.

## Risks / Trade-offs

- [Some corridor bends or junctions may require Wang masks not present in the supplied set] -> Keep those cells empty with explicit diagnostics and add only verified mappings from the source tileset.
- [A wall derived from adjacency could close a room entrance] -> Mark room sockets and corridor intersections as opening edges before wall derivation and test them directly.
- [Changing the serialized layer names can break existing debug fixtures] -> Regenerate repository fixtures and make the validator report a clear canonical-layer error for old files.
- [Variable-width corridors increase geometry cases] -> Test widths one, two, and three, both orientations, bends, intersections, and room connections with deterministic seeds.
