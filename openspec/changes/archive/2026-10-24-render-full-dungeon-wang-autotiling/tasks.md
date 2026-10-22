# Tasks

## 1. Wang mapping and sparse world model

- [x] 1.1 Add a renderer-neutral dungeon Wang role table sourced from `cryptbound/documentation/dungeon-wang-mapping.md`, resolve complete eight-neighbor walkable masks, and verify supported IDs, tile 13 interiors, and unsupported masks with focused Node tests.
- [x] 1.2 Replace the current all-cell floor/wall terrain output with sparse walkable and supported-boundary entries, omit deep blocked interiors, and expose unsupported diagnostic coordinates without changing the binary map; verify terrain coordinates and reachability remain unchanged.
- [x] 1.3 Remove the nearest-wall fallback from the full-dungeon Wang path and document that no guessed or unrelated wall art is selected; verify unsupported masks resolve to no tile rather than a legacy wall frame.

## 2. Babylon Lite rendering and diagnostics

- [x] 2.1 Update the Babylon world renderer to consume sparse terrain entries and keep tile 13 as the walkable interior frame; verify pixel-perfect 32-by-32 placement at native zoom.
- [x] 2.2 Create a reusable semi-transparent red 32-by-32 dynamic texture with Canvas 2D and render unsupported-cell diagnostics in an ordered layer for both game and minimap views; verify markers share terrain coordinates and are omitted when no mask is unsupported.
- [x] 2.3 Ensure deep blocked cells allocate no terrain sprite handles and that view updates replace stale sparse terrain and diagnostics after floor descent or save restoration; verify with renderer lifecycle tests.

## 3. View consistency and browser evidence

- [x] 3.1 Extend world/minimap tests to assert identical walkable, Wang-boundary, diagnostic, actor, player, and exit coordinates while preserving independent camera and scale behavior.
- [x] 3.2 Run one focused browser check with a seeded muted launch and verify the game shows background through deep blocked regions, tile 13 walkable interiors, and Wang boundary art where supported. The later production-clean rendering decision replaces normal-play red diagnostics with the explicit `debug-wang=1` opt-in. Verified 2026-10-24 using the existing muted preview with `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_PORT=6080 npx playwright test rogues-dungeon/test/browser/wang-autotiling.spec.ts --project=chromium --grep 'production Wang artwork production-17'` (1 passed).
- [x] 3.3 Update the dungeon Wang mapping documentation with the runtime placement rule, sparse-rendering behavior, and unsupported-marker meaning; verify all referenced files and seed examples are valid.

## 4. Integration verification

- [x] 4.1 Run the applicable Node tests and production build, resolving regressions attributable to this change and recording unrelated pre-existing failures separately.
- [x] 4.2 Run the full applicable browser suite during finalization and verify a fresh seeded reload preserves sparse terrain, diagnostics, save resumption, movement, and minimap consistency.
