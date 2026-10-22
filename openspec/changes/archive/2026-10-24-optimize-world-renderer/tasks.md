# Tasks

Tasks 1 through 4.1 retain the initial implementation history. The extension begins at group 5. The original incomplete tasks 4.2 and 4.3 move to 8.2 and 8.3. Historical checks do not verify the new work. The initial playtest was delivered. The user explicitly approved continuing through all remaining tasks, including bounded experiments and final verification, on 2026-10-23. Preserve normal visual defaults.

## 1. Static presentation and game-view culling

- [x] 1.1 Add a floor-keyed compiled static world presentation model that resolves autotile frames outside the render loop, with focused unit tests proving unchanged data is reused.
- [x] 1.2 Partition terrain and walls into camera-culled chunk layers that are deactivated outside the cull area, verifying camera movement, zoom, and resize retain correct map coordinates.
- [x] 1.3 Deactivate every offscreen dynamic visual and skip its sprite updates and animation sampling while preserving depth and phase on re-entry; verify focused renderer tests pass.

## 2. Semantic minimap and future mask boundary

- [x] 2.1 Replace minimap game-art sprite setup with a compact semantic cell-marker renderer that loads no gameplay sprite atlases, verifying player, walls, exit, pickups, and enemies retain matching coordinates.
- [x] 2.2 Add renderer-agnostic per-cell discovery and normalized-light interfaces that do not invalidate static chunks, with focused tests for independent updates.

## 3. Combat decal lifecycle

- [x] 3.1 Change landed damage particles to fade independently and expire ten seconds after their own landing time, with unit tests for staggered expiry and opacity.
- [x] 3.2 Ensure offscreen landed decals perform no visual update and are released on expiry; verify particle and renderer-focused tests pass.

## 4. Integration verification

- [x] 4.1 Run npm test and npm run typecheck, resolving renderer regressions.

## 5. Metrics and reversible developer experiments

- [x] 5.1 Add low-overhead frame intervals/preparation timings and counters for model builds, static compilations, discovery decodes, visited cells, active layers/sprites, patches, and minimap uploads; separately time total actions, clone/upgrade, tick/AI, navigation, save serialization/storage, and React/presentation work. Record tick counts, enemy visits, and worst action duration with inclusive/exclusive timing labels. Document seed 17, level 1, native zoom, Center/gridless mode, five-second warmup and ten-second route protocol in rogues-dungeon/documentation/renderer-performance.md. Verify one baseline sample records browser/device, refresh cadence, viewport/DPR, source state, settings, dimensions, and counts without claiming CPU time is GPU time.
- [x] 5.2 Add the viewport Perf control and temporary in-memory campaign ownership, with an exit-to-reference action and no persistent experiment writes. Verify a focused session test leaves all normal saved-slot bytes unchanged across movement, regeneration, Save and Quit, exit, and reload; document the temporary-session label.
- [x] 5.3 Parameterize underground generation and dimension-dependent placement/navigation/autotiling for the World Size cycle 100x100, 50x50, 200x200; regenerate the same reference seed/settings and character baseline at the entrance, reset transient presentation, and report actual population counts. Scale budgets by usable area, keep prefab interiors authored, and retain the previous experiment on failure. Verify deterministic dimensions, valid in-bounds placements, and reachable entrance/exit once at each size with seed 17; document per-axis percentages and cell counts.
- [x] 5.4 Add independent Camera/20x20 draw-region, Full/Static animation, dynamic-visuals on/off, and Live/Frozen/Off minimap controls. Exclude partial chunks outside the diagnostic rectangle before submission; preserve authoritative simulation and player/camera travel. Verify small focused bounds/state tests and work counters for the combined terrain-and-player-only mode; document that hidden enemies still simulate and existing mute controls isolate audio.
- [x] 5.5 Add Simulation Live/Frozen independently of presentation controls, restricted to the temporary session. Keep collision-aware player travel, camera, and rendering active while skipping time advancement, enemy/projectile turns, encounter progression, and periodic simulation callbacks; reject state-changing interactions with an explanation. Verify focused tests that frozen movement changes player pixels without changing time/enemy/projectile/encounter state, normal sessions remain live, and resume adds no catch-up ticks. Document which CPU work still runs while frozen.

## 6. Large frame-path fixes and early playtest

- [x] 6.1 Remove full-world model/filter work from ordinary frames: retain static presentation across unchanged geometry copies, cache decoded discovery by revision, and maintain revision-driven semantic lists/spatial queries. Verify focused tests that movement copies reuse geometry, repaired/floor revisions invalidate it, and multiple cell lookups decode unchanged discovery only once; record one post-change reference-route sample.
- [x] 6.2 Coalesce per-view preparation into one display-frame update, eliminate repeated dormant pool/pivot patches, and avoid unnecessary React projection rerenders. Verify preparation counters stay at most one per active view per frame, dormant updates stay zero, and visible positions/depth remain correct; record one reference-route sample and document the before/after costs.
- [x] 6.3 Retain the minimap's generated colored-dot background and update shared interpolated mover markers independently, with no PNG/game-art loads and no static-map uploads for marker-only travel. Suspend hidden/off views and reconcile on resume. Verify focused revision/coordinate tests for player/enemy/barrel and puzzle states, then record one sample with minimap live versus off and document upload counters.
- [x] 6.4 Run one focused muted Playwright CLI Microsoft Edge check on seed 17 after this implementation group: healthy game/canvas/minimap and console, working Perf controls/regeneration, save isolation, movement, and the brief comparison route. Capture one sample per isolated setting/alternate size, including Simulation Frozen with identical visual settings and reference route, plus the combined minimal mode using the design protocol. Verify frozen tick/enemy counters are zero while the player moves, compare CPU phase and frame-time deltas, and document remaining CPU suspects even if freezing brings no improvement; do not launch a broad seed/device matrix.
- [x] 6.5 Record delivery of the first playtest, the user's explicit instruction to finish without another mandatory stop, and the decision to preserve normal visuals and gameplay rules. Do not claim unobserved human acceptance.

- [x] 6.6 Exclude static terrain, legacy numeric grids and authored tile layers from deep action copies across active/visited floors and recovery snapshots, preserving mutable alias relationships and isolation. Avoid full-grid normalization/map reconstruction during trusted session movement; retain legacy/import/repair compatibility. Verify focused isolation, invalidation and deterministic action/event tests.
- [x] 6.7 Compare one seed-17 100x100 and 200x200 movement route after static sharing against the retained first-fix sample, report clone/action/frame deltas, and repeat focused save isolation. Continue into group 7 without a second playtest stop.

## 7. Bounded rendering experiments

- [x] 7.1 Prototype fewer game-view submissions using compatible batching or cached chunk composition; use fragment WGSL tile-index/atlas lookup if applicable to measured submission cost. Timebox to one implementation session and one reference-route comparison. Verify wall/actor/shadow ordering, pixel edges, and seams in the sample; document keep/discard, complete timings, and measured gains or losses rather than retaining an unproven shader path.
- [x] 7.2 Prototype worker preparation of revision-tagged static semantic/minimap typed buffers, including transfer latency, stale-result rejection, and last-valid presentation. Timebox to one implementation session and one reference-route comparison; verify a stale-response focused test and document keep/discard or unsupported capability. Assess and document OffscreenCanvas full-render ownership constraints without expanding this task into engine migration.
- [x] 7.4 Use the measured Live/Frozen comparison and CPU phase timings to assess background simulation. If simulation is a demonstrated large cost, run one bounded worker-queue or cooperative-scheduling feasibility experiment at safe commit boundaries; otherwise document why it was not justified. Verify deterministic action/event order, one authoritative state writer, save-after-commit, stale-result rejection, and no input-latency regression including transfers. Record a keep/discard decision; a Promise-only wrapper does not qualify as CPU offloading. Run after the cloning comparison.
- [x] 7.3 Integrate eligible measured winners, remove losing prototype code, and apply the unchanged normal visual/draw-distance defaults recorded at 6.5. Keep the normal presentation default unless the user agreed to change it. Verify a single reference-route comparison against baseline and the first-fix result, focused changed-contract tests, cleanup on floor/session changes, and documented gain/remaining bottleneck; treat 120 FPS as the target, not a completion threshold.

## 8. Integration finalization

- [x] 8.1 Run npm test and npm run typecheck for the completed extension and resolve regressions; verify both pass and record the result without counting historical task 4.1 as new evidence.
- [x] 8.2 Complete original task 4.2: run the required three-context muted browser verification, including Playwright CLI Edge, desktop Edge, and IAB; record healthy game/canvas/minimap, console state, and any unavailable capabilities. Verify normal and temporary sessions retain their ownership across floor changes and fullscreen/layout changes.
- [x] 8.3 Complete original task 4.3: profile sustained running at every currently supported zoom on the reference seed, report FPS and median/p95 intervals against the 120 FPS/8.33 ms target with device/refresh context, and document remaining large bottlenecks and chosen trade-offs.
- [x] 8.4 Run the applicable full browser suite once for finalization after the owned playtest server is stopped, respecting the suite's server ownership. Verify camera/depth, pixel output, movement, minimap/preview, and persistence regressions are covered and report pass/failure evidence; do not substitute a large testing matrix for the earlier human playtest.
