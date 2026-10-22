# Tasks

## 1. Establish the vendor-neutral asset layout

- [x] 1.1 Inventory every file under `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/`, classify it as runtime art, runtime data, prefab, example, or provenance material, and record the intended destination in the change notes; verify the inventory accounts for every current file.
- [x] 1.2 Move the supplied pack's characters, enemies, items, and props into `art/game-view/characters/`, `art/game-view/enemies/`, `art/game-view/items/`, and `art/game-view/props/`, preserving filenames and substructure; verify no required runtime asset remains only under `art/vendors/`.
- [x] 1.3 Create `art/game-view/tilesets/art/`, `art/game-view/tilesets/data/`, `art/game-view/tilesets/examples/`, `art/game-view/maps/examples/`, and `art/game-view/maps/prefabs/`; move canonical atlas PNGs and runtime TSX definitions into the corresponding directories and move Tiled example maps into `maps/examples/`; verify the proposed tree contains no `tiled-examples/` directory.
- [x] 1.4 Update `rogues-dungeon/public/assets/art/README.md` and asset provenance documentation to describe the use-based layout and retain the pack's source, license, and attribution; verify the documentation contains no instruction to preserve a `vendors/` directory.

## 2. Repair Tiled data and runtime asset references

- [x] 2.1 Update all TSX image paths and TMX/TMJ tileset-source paths for the new `tilesets/art/`, `tilesets/data/`, and `maps/examples/` locations; verify every example map and TSX file resolves its referenced files with a focused path-resolution test.
- [x] 2.2 Update source URLs, generated Wang-rule source metadata, debug fixtures, content tests, and browser fixture URLs to remove `vendors/` and `tiled-examples/`; verify `rg -n "vendors|tiled-examples|dungeons-and-pixels-v1.4" rogues-dungeon/src rogues-dungeon/test rogues-dungeon/public` returns only intentional provenance or migration documentation references.
- [x] 2.3 Update the editable-map export path handling so the exported dungeon TSX and PNG remain portable after the move; verify the existing export test or a focused archive inspection confirms both files are present and their relative image path is valid.

## 3. Consolidate tile-based art representations

- [x] 3.1 Inventory atlas frames and loose item/prop files used by the runtime, including item UI icons, coin animation, torch and trap animation, chest, door, barrel, and crate art; verify each consumer has a documented atlas frame and anchor or is explicitly retained as a non-duplicate exception.
- [x] 3.2 Migrate world and UI consumers to the canonical atlas-backed item and prop frames, including the title-bar key/coin icons and individual animation consumers; verify focused unit tests cover frame coordinates, dimensions, anchors, and animation frame counts.
- [x] 3.3 Move the example-only `objects-overlay.tsx` into `tilesets/examples/`, update example maps, and keep runtime object rendering on `objects-overlay.png`; verify Tiled examples still resolve and barrel, door, chest, and crate presentations retain their expected art and anchors.
- [x] 3.4 Remove only loose item/prop files proven redundant after migration, leaving character/enemy assets and any deliberately retained source files untouched; verify no runtime URL references a removed file and the remaining asset manifest contains one authoritative representation for each consolidated tile-based sprite.

## 4. Add the runtime prefab boundary

- [x] 4.1 Define the prefab data contract for footprint, origin, anchors or entrances, walkability, protected overlap, and authored objects, keeping it separate from renderer code; verify focused tests cover valid and invalid placement metadata.
- [x] 4.2 Add the hero-house prefab under `rogues-dungeon/public/assets/art/game-view/maps/prefabs/` in a Tiled-compatible format and include any required placement metadata; verify the prefab can be parsed and its referenced tileset data resolves from `game-view/tilesets/data/`.
- [x] 4.3 Implement conditional prefab selection in the procedural generation layer for the situation that requires the player's house; verify generation selects the prefab for that condition and does not randomize over its authored footprint.
- [x] 4.4 Implement atomic prefab placement that validates bounds, protected content, anchors, walkability, and authored objects before copying cells into the generated map; verify invalid candidates leave the map unchanged and valid candidates produce one coherent stamped fragment.
- [x] 4.5 Add focused tests for prefab discovery, conditional selection, valid stamping, invalid overlap, and deterministic retry or failure behavior; verify the existing procedural-generation test suite remains green.

## 5. Integrate and verify the migrated game

- [x] 5.1 Verify the renderer, minimap, and exported map paths consume the migrated assets without changing world coordinates, depth ordering, or map geometry; run the focused renderer/content tests and confirm they pass.
- [x] 5.2 Run one focused browser smoke check with `?mute=1` covering dungeon startup, terrain rendering, an item or prop presentation, and the hero-house generation condition; verify no asset request fails and the authored prefab appears when required.
- [x] 5.3 Run the applicable repository checks, including OpenSpec validation, TypeScript/build checks, and the relevant Node/browser tests; verify no old runtime asset path remains and document any unavailable final-suite capability.
