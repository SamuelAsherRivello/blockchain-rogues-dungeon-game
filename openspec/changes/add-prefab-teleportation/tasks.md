# Tasks

## 1. Prefab definitions and authored asset contract

- [ ] 1.1 Extend the prefab definition model to distinguish stamp prefabs from standalone teleport prefabs, expose authored entrance metadata, and validate the `player-home.tmx` footprint; verify with focused prefab-system tests and the existing Tiled asset-content checks.
- [ ] 1.2 Preserve `stampPrefab` as an atomic generation-time operation and document the player-home asset ID/path and supported map layers; verify existing stamp tests remain green and the authored `player-home.tmx` reference resolves.

## 2. Teleport-arrow generation and domain actions

- [ ] 2.1 Add the teleport-arrow entity/data contract and deterministic one-per-level placement after required reservations; verify normal generation produces exactly one legal arrow per level with repeatable positions for the same generation identity.
- [ ] 2.2 Add `leveltest=1` developer-setting normalization and constrain the World 1, Level 1 arrow to within 50 grid cells of the starting point; verify placement distance and non-overlap in focused generation tests while leaving unrelated levels unchanged.
- [ ] 2.3 Add standalone prefab entry action semantics distinct from `enter-stairs`, including no time tick, no enemy phase, unchanged dungeon level, authored entrance placement, and explicit one-way return omission; verify with domain action/event tests.

## 3. Active prefab context and persistence

- [ ] 3.1 Add active-map context to campaign state and normalize legacy campaigns to the generated dungeon floor; verify save migration tests preserve existing floor state and reject malformed prefab context safely.
- [ ] 3.2 Persist and restore the active player-home context and local player position without changing dungeon identity; verify autosave/resume tests cover a campaign saved inside the prefab.

## 4. Rendering and iris transition

- [ ] 4.1 Render teleport arrows as object-layer visuals above the floor using the shared world-depth ordering and temporary four-direction arrow artwork; verify renderer-model tests cover object coordinates, depth ordering, and minimap projection.
- [ ] 4.2 Load the standalone player-home map into the active renderer context and invalidate stale dungeon and minimap geometry when the context changes; verify focused renderer tests show matching game/minimap geometry for the prefab.
- [ ] 4.3 Connect arrow entry to the existing iris close/context-swap/open lifecycle and block movement during the transition; verify one muted Playwright check at the level-test entry path confirms the arrow, iris completion, player-home view, unchanged Dungeon Level, and no console errors.

## 5. Integration verification

- [ ] 5.1 Run the focused Node test suite and typecheck, then inspect the resulting diff to confirm no unrelated working-tree changes are included; verify all new prefab, generation, action, persistence, and rendering tests pass.
- [ ] 5.2 Run the applicable final browser verification with `?mute=1` after the project-owned server workflow is available; verify the full applicable browser suite and report any unavailable WebGPU or browser capability.
