# Tasks

## 1. URL and deterministic generation contract

- [x] 1.1 Add a pure URL-options parser for `world`, `level`, `slot`, `seed`, `mute`, and `debug-fix-map-autotiled`, including valid-slot and unsigned-seed validation; verify valid, invalid, and missing query values with focused Node tests.
- [x] 1.2 Thread explicit world, level, seed, and generator-version inputs through campaign/floor reconstruction while preserving existing random-seed compatibility and normal new-game behavior; verify the same inputs produce identical floor maps, entities, start, and exit coordinates.
- [x] 1.3 Start valid URL-selected slots through the existing save migration/session/autosave path and keep missing, invalid, or unavailable slots on the menu; verify occupied and empty slots with Node tests and a direct URL browser assertion.

## 2. Tiled export and repair-map validation

- [x] 2.1 Add renderer-neutral Tiled TMJ export for the active floor with walkability, terrain roles, entities, player, exit, dimensions, coordinate convention, world, level, seed, and generator-version metadata; verify round-trip serialization with a checked-in fixture.
- [x] 2.2 Add local repaired-map loading behind `debug-fix-map-autotiled=1`, validating dimensions, required layers, metadata, entity bounds, player/start, exit, and walkability before activation; verify invalid maps leave the active campaign unchanged.
- [x] 2.3 Convert a validated repaired map into the existing campaign floor shape without changing collision, pathfinding, save schema, or turn simulation; verify movement and reachability against the repaired walkability layer with focused Node tests.
- [x] 2.4 Document the URL contract, export format, metadata, local-file workflow, and fixture update process in `cryptbound/documentation/`; verify every documented example uses the supported parameters.

## 3. Renderer and map-fix controls

- [x] 3.1 Expose export/import controls only when `debug-fix-map-autotiled=1` is active and show clear validation failures without exposing repair controls on ordinary URLs; verify the normal menu and map-fix UI states in component tests.
- [x] 3.2 Render generated and repaired floors through the same WorldRender model for game and minimap views, retaining Wang diagnostics, camera behavior, and coordinate consistency; verify shared terrain, actor, player, exit, and diagnostic coordinates with renderer tests.
- [x] 3.3 Add one focused muted Playwright check using a seeded direct-slot URL to confirm the menu is skipped, map-fix controls are visible only with the specific flag, and a repaired fixture can load without a stale minimap.

## 4. Integration verification

- [x] 4.1 Run focused Node tests for URL parsing, deterministic generation, save startup, Tiled serialization/validation, collision/pathfinding, and renderer projections; resolve regressions attributable to this change.
- [x] 4.2 Run the production build and full applicable Playwright suite with `?mute=1`, covering direct URL startup, save resumption, movement, repaired-map loading, and game/minimap consistency; report unavailable WebGPU capability instead of treating visual coverage as passed.
