# Tasks

## 1. Prefab definitions and authored asset contract

- [x] 1.1 Extend the prefab definition model to distinguish stamp prefabs from standalone teleport prefabs, expose authored entrance metadata, and validate the `player-home.tmx` footprint; verify with focused prefab-system tests and the existing Tiled asset-content checks.
- [x] 1.2 Preserve `stampPrefab` as an atomic generation-time operation and document the player-home asset ID/path and supported map layers; verify existing stamp tests remain green and the authored `player-home.tmx` reference resolves.

## 2. Teleport-arrow generation and domain actions

- [x] 2.1 Add the teleport-arrow entity/data contract and deterministic one-per-level placement after required reservations; verify normal generation produces exactly one legal arrow per level with repeatable positions for the same generation identity.
- [x] 2.2 Add `leveltest=1` as an alias for the existing level-one test setting and constrain the World 1, Level 1 arrow to within 50 grid cells of the starting point; verify placement distance and non-overlap in focused generation tests while leaving unrelated levels unchanged.
- [x] 2.3 Add paired dungeon/home teleport actions distinct from `enter-stairs`, including no time tick, no enemy phase, unchanged dungeon level, and viable cardinal-adjacent arrival on both sides; verify bidirectional domain action/event tests.

## 3. Active prefab context and persistence

- [x] 3.1 Add active-map context to campaign state and normalize legacy campaigns to the generated dungeon floor; verify save migration tests preserve existing floor state and reject malformed prefab context safely.
- [x] 3.2 Persist and restore the active player-home context, originating dungeon arrow context, and local player position without changing dungeon identity; verify autosave/resume tests cover campaigns saved inside the prefab and after returning.

## 4. Rendering and iris transition

- [x] 4.1 Render teleport arrows as object-layer visuals above the floor using the shared world-depth ordering and temporary four-direction arrow artwork; verify renderer-model tests cover object coordinates, depth ordering, and minimap projection.
- [x] 4.2 Load the standalone player-home map and its return arrow into the active renderer context and invalidate stale dungeon and minimap geometry when the context changes; verify focused renderer tests show matching game/minimap geometry for the prefab.
- [x] 4.3 Connect both arrow directions to the existing iris close/context-swap/open lifecycle and block movement during each transition; verify one muted Playwright check at the level-test entry path confirms dungeon-to-home entry, home-to-dungeon return, cardinal-adjacent arrival, unchanged Dungeon Level, and no console errors.

## 5. Integration verification

- [x] 5.1 Run the focused Node test suite and typecheck, then inspect the resulting diff to confirm no unrelated working-tree changes are included; verify all new prefab, generation, action, persistence, and rendering tests pass.
- [x] 5.2 Run the applicable final browser verification with `?mute=1` after the project-owned server workflow is available; verify the full applicable browser suite and report any unavailable WebGPU or browser capability.
