# Design

## Context

See `proposal.md` for the motivation. The current pack is rooted at `public/assets/art/vendors/dungeons-and-pixels-v1.4/`. Runtime terrain loads `tileset-dungeon.png` and its TSX definition, while item and prop rendering mixes atlas PNGs with loose item, prop, and animation-frame PNGs. Tiled examples currently carry their own TSX directory and reference both atlas and loose art through relative paths. The procedural world currently produces maps from code rather than stamping authored map fragments.

The migration inventory is complete: 49 character files move to `art/game-view/characters/`, 298 enemy files to `art/game-view/enemies/`, 18 item files to `art/game-view/items/`, 64 prop files to `art/game-view/props/`, six atlas PNGs to `art/game-view/tilesets/art/`, six TSX definitions to `art/game-view/tilesets/data/`, and six Tiled example files to `art/game-view/maps/examples/`. No source files remain under the former vendor tree.

## Goals / Non-Goals

**Goals:**

- Create a stable, vendor-neutral asset tree with `ui/` and `game-view/` presentation categories; `game-view/` contains `characters`, `enemies`, `items`, `props`, `particles`, `tilesets`, and `maps`.
- Make `game-view/tilesets/art/` and `game-view/tilesets/data/` the canonical runtime locations for tile-based atlas artwork and TSX definitions.
- Move non-runtime Tiled maps and example-only tileset data into explicit `examples` directories.
- Add a runtime `maps/prefabs/` boundary for authored map fragments, beginning with the hero house.
- Consolidate duplicate tile-based item and prop representations onto atlas-backed frames where the existing atlas can satisfy the consumer, removing loose duplicates only after all references have migrated.
- Preserve authored provenance and validate every moved relative path.

**Non-Goals:**

- Redesigning the art, changing character or enemy animation packaging, or replacing the supplied asset pack.
- Adding a general-purpose map editor or a new procedural-generation algorithm beyond the prefab integration point.
- Making every standalone PNG in the entire project an atlas; loose character/enemy assets remain supported.
- Treating example maps as runtime content.

## Decisions

### Runtime atlas and loose-art inventory

- `items-static.png` is the authoritative 3x3 item atlas for world pickups; the title-bar golden key uses frame 5.
- `items-animated.png` is the authoritative 4x2 coin atlas; world pickup and chest-throw animations use frames 0–3, including the title-bar coin icon.
- `props-animated.png` is authoritative for floor-trigger frames and trap frames 0–6. The loose torch sequence remains because its pixels do not match the atlas frames.
- `props-static.png` is authoritative for open-crate frames. Loose chest, door, and barrel files remain until their anchors and crops are proven equivalent to atlas art.
- `objects-overlay.png` is the runtime source for closed crates and puzzle overlays. Its `objects-overlay.tsx` is example-only Tiled metadata and belongs under `tilesets/examples/`, not in the runtime TSX set.

### Use an atlas-first contract for tile-based runtime art

Runtime tile-based art will use the existing atlas PNGs under `tilesets/art/`, with matching TSX definitions under `tilesets/data/`. Item and prop consumers that currently load loose images will be migrated to atlas frame coordinates or an equivalent atlas-backed presentation. This makes one image representation authoritative for terrain, items, animated props, static props, and overlay objects.

The alternative is to retain both atlases and loose PNGs as parallel runtime sources. That would minimize immediate renderer changes but preserve the ambiguity and duplication this change is intended to remove.

### Keep example definitions separate from runtime definitions

Maps under `maps/examples/` may reference the canonical TSX definitions in `tilesets/data/`; they remain non-runtime because only the examples directory is excluded from generation inputs. A TSX file is placed in `tilesets/examples/` only when it exists solely to demonstrate a non-runtime asset or layout. This avoids copying canonical TSX definitions merely to keep example maps editable.

### Treat prefabs as authored map fragments, not examples

`maps/prefabs/` is a runtime asset boundary. A prefab is represented as a Tiled-compatible map fragment plus placement metadata or an established convention for footprint, origin, entrances, walkability, protected overlap, and authored objects. The first concrete asset is `hero-house.tmx`. The generator validates a candidate placement before applying a single atomic stamp to the generated floor.

### Keep generation and rendering responsibilities separate

The procedural generation layer owns prefab selection, placement validation, and map composition. The renderer continues to consume the resulting active realm and does not know whether cells came from random generation or a prefab. This preserves the existing world-view/minimap geometry contract and keeps prefab logic out of React UI and Babylon rendering.

### Preserve provenance outside the path layout

Removing `vendors/` changes discoverability, not ownership or attribution. The existing asset provenance record remains the source of pack name, source, license, and attribution; the new directory names describe use and format rather than origin.

## Risks / Trade-offs

- [Risk] Atlas frame coordinates may not reproduce the anchor, crop, or dimensions of loose object files exactly. -> Mitigation: inventory every runtime consumer, preserve per-frame anchor metadata, and compare focused renderer screenshots before deleting loose files.
- [Risk] Tiled relative paths can silently break after moving maps and TSX files. -> Mitigation: update references as a coordinated move and add a path-resolution test that loads every example map and runtime TSX definition.
- [Risk] A prefab may overlap generated content or fail to fit on small maps. -> Mitigation: validate the complete footprint before stamping and provide a deterministic retry/failure path.
- [Risk] Existing generated Wang metadata can drift from the moved source TSX. -> Mitigation: regenerate or verify the generated rules from the canonical `tilesets/data/tileset-dungeon.tsx` and keep a source-path assertion in tests.
- [Risk] The first prefab may require object semantics not represented by raw Tiled cells. -> Mitigation: define an explicit authored-object import boundary and keep unsupported object types rejected rather than silently dropped.
