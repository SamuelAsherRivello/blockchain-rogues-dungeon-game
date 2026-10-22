# Proposal

## Why

The current art tree exposes the source-pack concept through a `vendors/` directory and mixes runtime tileset inputs with Tiled example maps and example tileset definitions. That makes runtime assets harder to discover and leaves example-only files looking like production dependencies. The layout should describe how the game uses the assets, while provenance remains documented separately.

## What Changes

- **BREAKING** Remove the `art/vendors/dungeons-and-pixels-v1.4/` path segment and promote the pack's usable asset categories to direct children of `art/`:
  - `characters/`
  - `enemies/`
  - `items/`
  - `props/`
  - `tilesets/`
  - `maps/`
- Organize runtime tileset assets under `art/tilesets/`:
  - `art/tilesets/art/` contains runtime PNG tile artwork and spritesheets.
  - `art/tilesets/data/` contains runtime TSX tileset definitions.
- Organize map assets under `art/maps/`:
  - `art/maps/examples/` contains Tiled example maps only and is never loaded by the game at runtime.
- Add `art/maps/prefabs/` for authored map fragments that runtime generation may stamp into a generated map under explicit game conditions.
- Treat the hero's house as the first prefab candidate, for example `art/maps/prefabs/hero-house.tmx`; unlike an example map, a prefab is a runtime input.
- Keep prefab placement separate from ordinary random generation: generation logic selects when a prefab is required, chooses or validates its placement, and copies the prefab's authored terrain and object layout into the generated map.
- Define prefab placement metadata or conventions for the integration boundary, including the prefab's footprint, valid anchors or entrances, blocked and walkable cells, and any authored objects that must be instantiated with it.
- Keep a sibling `art/tilesets/examples/` directory available for tileset-specific example data when such files are needed; it is also non-runtime.
- Remove the current `tiled-examples/` grouping and place its example maps under `art/maps/examples/`; move any example-only tileset definitions under `art/tilesets/examples/`.
- Update all runtime imports, URL construction, generated references, fixtures, tests, and Tiled relative paths to the new locations.
- Ensure runtime code loads only from `tilesets/art/` and `tilesets/data/`, never from either examples directory.
- Preserve the original asset-pack provenance, license, source, and attribution documentation without retaining `vendors` as an asset-layout concept.
- Preserve the delivered character, enemy, item, prop, and tileset artwork; this proposal changes organization and references, not the art itself.

## Capabilities

### New Capabilities

None. This is an internal repository organization and path-migration change.

### Modified Capabilities

None. No user-facing or game-rule requirements change.

## Impact

- Affects `rogues-dungeon/public/assets/art/` and all files that reference its current vendor and Tiled-example paths.
- Affects runtime tileset loading in the Babylon renderer and game export/download support.
- Introduces a future runtime map-fragment input and a generation integration point for conditional prefab stamping, beginning with the hero's house.
- Affects generated Wang-rule metadata and its source comments if those paths are embedded.
- Affects debug fixtures, Tiled maps, tests, asset documentation, and any scripts that scan or validate the old tree.
- No dependency changes are expected.
- Browser verification is not useful during proposal work; implementation should use focused path/reference tests and one browser smoke check after migration to prove the runtime assets still load.
