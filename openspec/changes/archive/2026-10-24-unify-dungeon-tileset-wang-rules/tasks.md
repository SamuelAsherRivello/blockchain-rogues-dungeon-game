# Tasks

## 1. Inventory and source contract

- [x] 1.1 Inventory the current `tileset-dungeon.tsx`, adjacent atlas dimensions, named Wang sets, renderer-local maps, and all current generator mask/topology producers; verify the inventory identifies every existing consumer and preserves unrelated dirty-worktree changes.
- [x] 1.2 Define the canonical fixture matrix for rooms, outer/inner corners, one-or-more-wide corridors, bends, T/plus junctions, room sockets, layered joins, start-room boundaries, deep void, and the reported tile-5/tile-17 cases; verify each fixture has an expected topology and rule-family label.
- [x] 1.3 Add only source-verified art/rule metadata to the external `rogues-dungeon/public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx`; verify its declared relative PNG reference resolves to the vendor-level atlas, local IDs stay in atlas bounds, and the TSX remains valid Tiled XML.

## 2. Canonical TSX rule validation

- [x] 2.1 Implement a renderer-neutral TSX rule loader/validator that normalizes Tiled Wang values in `N, NE, E, SE, S, SW, W, NW` order and reports malformed signatures, conflicting duplicates, missing image references, and out-of-range tile IDs; verify focused Node tests cover each rejection.
- [x] 2.2 Implement canonical rule resolution for named room-frame, corridor/edge/junction, void-frame, and detail families, including exact tile 5 and tile 17 identities where their verified roles apply; verify focused tests assert local IDs rather than visual similarity.
- [x] 2.3 Enumerate masks from all supported procedural generators and canonical fixtures, then require each emitted topology to resolve exactly or return a structured unsupported diagnostic; verify the coverage test fails when a new generator mask is not represented.
- [x] 2.4 Add fixture validation for explicit `Grounds`, `Walls`, `Pickups`, and `Decorations` roles and for non-overlapping ground/wall cells; verify malformed or ambiguous fixtures are rejected without changing the active floor.

## 3. Runtime and view integration

- [x] 3.1 Replace active renderer-local Wang authoring tables with the validated canonical rule model derived from `tileset-dungeon.tsx`; verify no runtime path authors a second mapping and the existing gameplay map remains unchanged.
- [x] 3.2 Remove the active `nearestFrame` substitution and route unsupported masks through the existing deterministic diagnostic behavior; verify focused renderer tests prove unsupported cells do not receive a visually similar wall tile.
- [x] 3.3 Integrate room, corridor, layered-join, start-room, void, and detail rule families while preserving sparse terrain, world-depth ordering, pixel-perfect 32-by-32 sampling, and game/minimap coordinate agreement; verify renderer tests cover supported boundaries, deep empty space, and corrected corner/side roles.
- [x] 3.4 Document the TSX source-of-truth boundary and generated/derived artifact policy, explicitly stating that Babylon renderer files consume validated rules but do not define them; verify the documented TSX and resolved PNG paths match the checked-in asset paths.

## 4. Browser evidence and integration verification

- [x] 4.1 Configure the repository-root Playwright command and local Chromium target for a deterministic muted Rogue's Dungeon route or fixture selector; verify browser artifacts remain ignored and the command is documented with `?mute=1`.
- [x] 4.2 Replace the diagnostic-positive smoke acceptance with a deterministic production-route Playwright check without debug flags: require WebGPU initialization, healthy consoles, zero unresolved cells, positive coordinate-specific expected tile occurrences, and inspected canvas screenshots without temporary overlays. Test deliberately unsupported input separately; report unavailable WebGPU without claiming a pass.
- [x] 4.3 Run focused TSX/rule/generator/renderer Node tests and the focused Chromium smoke test against the current dirty checkout without resetting unrelated work; verify all pass or record concrete failures and environment limitations.
- [x] 4.4 After section 5 passes, run applicable full Node/typecheck and browser finalization suites, including Playwright CLI Edge, desktop Edge and IAB checks under project server lifecycle rules. Record routes, seeds, zooms, screenshot paths, coverage and limitations. Repair failures and rerun affected checks; make no complete-rendering claim without evidence.

Finalization evidence and limitations: `rogues-dungeon/documentation/dungeon-wang-verification.md`. All 22 distinct autotiling browser cases have passing evidence, including one recovered Edge session. Focused Node tests and typecheck pass. Wider checkout Node/browser failures are recorded separately and are not claimed as passes.

## 5. Revised production acceptance

These tasks re-audit earlier completed work under the revised requirements. Earlier checkmarks describe prior implementation, not proof that the stricter acceptance passes. Complete 5.1 and 5.2 before the focused browser check, then 5.3 before finalization.

- [x] 5.1 Audit full TSX Wang identities, colors, family context, tile orientation and generated-artifact provenance against the resolved atlas and Tiled references. Build independently verified coordinate-level expectations for the canonical matrix, including tiles 5 and 17; correct any binary-normalization or copied-table errors and run focused rule tests.
- [x] 5.2 Resolve every supported generator/fixture shape using source-verified production roles and compatible layer composition while preserving gameplay data. Require zero unsupported cells across the fixture matrix and a documented deterministic multi-seed corpus. Gate all temporary diagnostic text, markers, grids and guidelines behind explicit developer opt-in. Do not hide unresolved geometry to pass.
- [x] 5.3 Use Playwright to capture and inspect actual canvas output for the full topology matrix and representative seeded floors at native and other exposed zooms. Check wall continuity, concave/convex corners, corridor joins, sockets, depth and void boundaries against independent references. Isolate and repair visual failures, rerun affected tests, and record evidence. Use the design's primary and backup paths for blockers; report any genuinely absent atlas role or unavailable required browser instead of marking incomplete work done.
