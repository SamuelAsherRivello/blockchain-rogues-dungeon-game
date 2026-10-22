# Design

## Context

See [proposal.md](proposal.md) and the two delta specs. The current renderer builds one terrain entry per map cell, places a floor underlay everywhere, and selects ordinary wall frames from four-neighbor masks. The exact source TSX now contains the verified `Dungeon room walls` mixed Wang set; its local-ID table is documented in `cryptbound/documentation/dungeon-wang-mapping.md`. Babylon Lite already renders the world through ordered sprite layers and supports dynamic textures backed by a canvas source.

## Goals / Non-Goals

**Goals:**

- Make the renderer-neutral world model produce sparse, deterministic Wang terrain for the entire map.
- Keep walkable interior cells visually filled with local tile 13 and use the verified Wang assignments for supported boundary masks.
- Return explicit diagnostic coordinates for unsupported walkable boundary masks and render them as semi-transparent red squares in game and minimap views.
- Keep the minimap and game view on the same model and world coordinates while allowing independent scale and camera framing.
- Preserve the binary map as the sole gameplay authority and retain pixel-perfect 32-by-32 rendering.

**Non-Goals:**

- Expanding the Wang set with guessed or visually similar assignments.
- Rendering deep blocked interiors, changing collision, or changing procedural generation.
- Adding a fallback renderer, new runtime dependency, or persisted decorative data.

## Decisions

### Use the documented Wang role table as runtime data

Encode the exact local-ID-to-eight-value assignments from the dungeon mapping note in a renderer-neutral module. For each walkable cell, compute the eight-neighbor mask using walkable map cells in Tiled order. Resolve a mapped local tile ID; use tile 13 for the all-walkable interior role. If no role exists, return no terrain tile plus a diagnostic entry. This keeps art authority explicit and prevents the existing four-neighbor blob table from silently substituting unrelated art.

### Keep terrain sparse

Emit terrain entries for walkable cells and supported Wang boundary cells only. Blocked cells are not emitted as ordinary floor or wall sprites. A blocked-cell neighborhood helper remains available for classification and tests, but it does not create art. This makes the clear background represent unreachable deep space and avoids allocating thousands of hidden sprites.

### Render diagnostics in a separate layer

Create one small semi-transparent red square texture with a browser Canvas 2D context, upload it through Babylon Lite's dynamic-texture API, and create a dedicated sprite layer after terrain but before actors and items. Allocate one reusable sprite handle per diagnostic slot and move unused handles offscreen. Both views consume the same `diagnostics` collection; minimap rendering changes only view scale and framing.

### Cache by map identity and view-independent geometry

Cache the computed Wang terrain and diagnostic coordinates by the immutable map reference plus dimensions. Do not include camera, zoom, minimap, or player position in the cache key. Recompute when a new floor map is generated or restored. This avoids per-frame mask work while ensuring a descended floor cannot reuse stale decoration.

### Browser evidence after renderer integration

Use focused Node tests for mask resolution, sparse omission, deterministic coordinates, and game/minimap equality. After the rendering layer is integrated, run one focused browser check with a seeded, muted launch to confirm that deep background is visible and red diagnostics align with the world. Reserve the full applicable browser and Node suites for finalization.

## Risks / Trade-offs

- [The limited Wang table leaves many real dungeon masks unsupported] -> Leave those cells untiled and mark them red; never invent a role or fall back to unrelated wall art.
- [A dynamic texture may be unavailable during WebGPU initialization] -> Keep the marker layer optional during setup and surface the existing initialization error; terrain rendering remains WebGPU-only.
- [Sparse terrain changes the visual density of the minimap] -> Use the same coordinate model in both views and verify full-realm framing plus diagnostic alignment in tests.
- [Legacy saves lack any presentation metadata] -> Derive all Wang output from the saved binary map at render time; do not migrate or persist decorations.
