# Proposal

## Why

The initial caching, culling, semantic minimap, and decal changes are implemented, but the player still reports about 21 FPS while walking. Inspection finds whole-floor presentation scans, repeated discovery decoding, dormant sprite updates, and movement-driven redraws that could consume far more time than the visible scene requires; sustained runtime profiling remains outstanding.

The first controlled route measured mean action cloning at 4.30 ms for 100x100 and 27.29 ms for 200x200, while tick/AI work stayed below 0.1 ms on average. The user approved prioritizing static-world sharing and continuing through all remaining tasks without another mandatory playtest stop.

## What Changes

- Compile static tile selection, including Wang/autotile results, when a floor is created or its static geometry changes rather than during rendering.
- Render the game view from camera-culled static chunks while preserving world depth, camera behavior, and pixel-perfect output.
- Draw only visible dynamic objects and animate only visible animated visuals; retain correct world simulation while offscreen.
- Replace the asset-heavy minimap presentation with a compact semantic cell vocabulary derived from the same world coordinates.
- Keep landed combat marks as independent decals that fade and remove after ten seconds.
- Remove whole-floor model construction and terrain filtering from ordinary animation frames. Decode existing discovery data once per revision and retain compiled geometry across movement-only campaign copies.
- Exclude immutable terrain, legacy grid adapters and authored tile layers from action deep copies, including visited floors and recovery snapshots. Clone mutable entities, encounters, resources and player state independently. Validate static data at session/import/repair boundaries rather than rescanning or rebuilding unchanged legacy grids on movement. Preserve save schemas and deterministic action/event behavior.
- Coalesce presentation work into one update per display frame; stop repeatedly patching dormant sprite pools and rerendering React overlays when no overlay needs projection.
- Make the minimap a retained field of colored dots with no PNG assets. Keep its current fit and scale, cache the static background, and update moving markers independently instead of repainting/uploading the entire map for player motion.
- Add a temporary developer performance session with a World Size button cycling 100x100, 50x50, and 200x200 cells. Each click regenerates the same seeded scenario at the selected dimensions and returns the player to its entrance, without overwriting normal saves.
- Add independent controls for normal versus 20x20 draw distance, full versus static animation, dynamic visuals on/off, and live/frozen/off minimap. Expose frame times and work counters so these experiments identify large costs.
- Add an independent Simulation Live/Frozen diagnostic in the temporary session. Frozen preserves player travel, collision checks, camera, and rendering while skipping time advancement, enemy/projectile turns, encounter progression, and periodic simulation callbacks. Measure action, cloning, tick/AI, save serialization, and React costs separately so remaining CPU work is visible even when ticks are disabled.
- Prototype fewer game-view draw submissions through batching or cached GPU composition, and a worker path for static presentation/minimap preparation. Evaluate asynchronous simulation only if the Live/Frozen comparison and phase timings identify a large simulation cost; use serialized, revision-tagged results rather than treating an async function as background execution. Retain only measured wins that preserve required rendering behavior.
- Start with one seed and a short repeatable route. The first controls/playtest were delivered. Continue with the cloning fix, bounded experiments, the original three-context verification, all-zoom profile and full applicable tests under the user's explicit continuation approval.
- Aim for stable 120 FPS, approximately 8.33 ms per frame, without making it a locked requirement or hardware-independent release gate. Favor substantial measured frame-time gains and playable trade-offs over minor tuning.

Lighting, new fog behavior, and speculative interfaces for either are outside this extension. Preserve existing discovery behavior and already implemented mask helpers without extending them.

## Capabilities

### New Capabilities

- `world-renderer-performance`: Efficient world presentation, transient decals, developer performance experiments, and reproducible performance reporting.

### Modified Capabilities

- `world-map-rendering`: Visible-cell presentation and cheap colored-dot minimaps with matching coordinates and independently updated moving markers.

## Impact

Affected systems include world presentation, Babylon Lite sprite layers and scheduling, developer controls, procedural floor dimensions, temporary session ownership, minimap drawing, CPU phase instrumentation, and a temporary simulation bypass. Existing depth, camera, normal turn rules, pixel-perfect output, and saved campaigns remain compatibility boundaries. The runtime remains Babylon Lite WebGPU-only, with no new dependency planned.

Acceptance requires usable experiment controls, no repeated full-map preparation for unchanged animation frames, no static minimap rebuild for marker-only movement, and a documented before/after frame-time comparison. No unmeasured speedup is promised. Playwright adds useful evidence after implementation: focused muted Edge scenarios followed by broader integration coverage. The earlier mandatory human-feedback wait is waived by the user's explicit instruction to finish; normal visuals remain unchanged. No browser run belongs to this planning step.
