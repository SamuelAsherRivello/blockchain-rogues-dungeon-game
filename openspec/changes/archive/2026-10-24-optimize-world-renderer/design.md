# Design

## Context

See proposal.md for motivation. The initial implementation has compiled Wang data, 16-cell chunks, a semantic minimap texture, and ten-second decals. Its browser and running-profile tasks remain incomplete. Current code observations are not measured percentages:

- Each game animation frame calls `WorldRender.Render`, filters whole-floor terrain/walls, and rebuilds entity/decorations/puzzle arrays before camera culling.
- Each discovery predicate allocates and decodes the complete serialized bitmap. The render model invokes it for many world entries.
- Static caches use grid/layer object identity. Pixel-only movement has a shallow-copy fast path, but turn actions can clone the campaign and replace unchanged geometry identities.
- Dormant actor/pickup slots call `hideCharacterSprite`, which still patches sprites. Disabled pivot markers also receive repeated patches. Campaign effects call `draw` alongside the animation loop, and camera projection changes trigger React updates.
- The minimap already uses a generated color texture instead of gameplay atlases, but repaints/uploads the entire map on campaign updates. Its current path uses committed positions despite the durable spec requiring interpolated movers.
- Generation uses 100x100 constants throughout placement and iteration. A genuine size experiment requires parameterizing those paths.
- `tick` advances time, filters projectiles, updates encounter lockdowns, and calls `enemyPhase`; enemy processing iterates the floor's enemies. These run synchronously during committed actions, alongside campaign cloning and save callbacks. They are additional candidates for movement stalls, not confirmed dominant costs.
- Installed Babylon Lite 1.32.0 declarations expose custom sprite fragment WGSL, extra textures, `renderFrame`, and `RenderCanvas` accepting `OffscreenCanvas`. This supports bounded prototypes, not an assumption that this DOM-dependent renderer can move unchanged to a worker.

The early playtest was delivered and its clean Edge measurements are in renderer-performance.md. Mean clone/upgrade cost rose from 4.30 ms at 100x100 to 27.29 ms at 200x200; mean tick/AI stayed below 0.1 ms. The user approved the cloning optimization and continued implementation through all remaining tasks.

## Goals / Non-Goals

**Goals:** Remove whole-world costs from steady animation; isolate large costs with developer controls; deliver a playable comparison early; retain only measured improvements toward 120 FPS.

**Non-Goals:** New lighting or fog behavior or infrastructure, automatic quality reduction, changed normal turn/AI rules, audio redesign, renderer fallback, or guaranteed 120 FPS on every device. A labeled temporary Simulation Frozen diagnostic is an explicit exception for measurement. Preserve current discovery behavior and already completed mask helpers without extending them.

## Decisions

- Retain static presentation by realm identity, dimensions, generator/static revision, and repaired-map revision, with explicit invalidation. Do not key only by seed or cloned array identity. Bound cache lifetime and release departed realms. Reuse a decoded read-only discovery mask until its encoded value or dimensions change; discovery writes use a separate mutable copy.
- Partition compiled terrain/walls into fixed grid chunks and select intersecting chunks from camera bounds. One whole-floor cache is rejected because it scales GPU allocation with total floor area and does not cull large levels.
- Refresh semantic lists and spatial buckets only on relevant domain revisions. Each frame queries intersecting buckets and samples visible positions/animations. Change chunk activation only at bounds changes. Hide a pooled visual once, then leave its dormant slots and disabled pivots untouched. Keep authoritative simulation independent of presentation.
- Coalesce campaign, camera, resize, and animation notifications into one preparation per active view per display frame, before GPU submission. Verify scheduling with the installed engine facilities instead of adding another independent loop. Keep React for UI; update projection state only for mounted overlays that need it. Instrument action/clone, AI, save, and React costs separately, retaining the existing pixel-motion fast path and autosave contract.
- Retain the minimap's fit, scale, passive input, and nearest-filtered dots. Gray terrain/wall dots and distinct actor, pickup, exit, and puzzle-state colors need no PNGs. Use the existing canvas drawing API to build the static color texture once, with small generated-color quads for moving markers. Dirty background cells only on terrain, occupancy, or current discovery changes. Marker-only interpolation must not repaint/upload the background. Use shared player/enemy/barrel presentation coordinates. Hidden minimaps skip preparation and rendering and reconcile revisions when shown.
- Keep each landed combat decal as an individual record and layer/visual unit. It fades after landing and is removed at ten seconds; it is not baked or merged because independent lifetime is required.
- Make camera culling a full deactivation boundary: chunks and dynamic visuals outside it are invisible and receive neither sprite patches nor animation sampling. Profile sustained running at every zoom as an optimization target, reporting frame data rather than enforcing a universal hardware gate.

### Copy mutable campaign state without static geometry

Action copies omit cells, legacy numeric maps and authored tile layers before structured cloning, including nested visited floors and recovery snapshots, then reattach their immutable references. Mutable floor shells, entities, projectiles, encounter/puzzle objects, player resources, inventory, progression and recovery data remain independently owned. Preserve alias relationships within the cloned mutable graph.

Normalize legacy/imported static data at session and replacement boundaries. The authoritative session may reuse validated static geometry during ordinary actions; standalone legacy action callers retain compatibility validation. Do not generate numeric legacy maps, stringify terrain or traverse every cell on the trusted movement path. Geometry changes use replacement references and invalidate renderer caches. Do not freeze arbitrary caller-owned campaigns or share mutable encounter/player objects. No save schema change or asynchronous turn processing is required.

Verify old state cannot change through mutable result edits, static identity is shared across current/visited/recovery floors, legacy edits and repaired maps remain valid, and seeded action/event results match a full-copy control. Compare the same 100x100 and 200x200 route and saved-session behavior before and after.

### Developer performance session

Add a compact Perf control opening session-only options within the viewport. Capture the current campaign as a reference and run experiments in an in-memory session with persistence disabled. Route autosave and Save and Quit through that ownership boundary. Exiting restores the reference; reload reads normal storage. Show a temporary-session label.

World Size cycles 100x100, 50x50, and 200x200. Percentages apply per dimension, so cell counts are 100%, 25%, and 400%. Each click reuses the reference seed, level, character/world attributes, generator version, and test flags; regenerates the underground floor; restores the same character baseline at its entrance; clears transient input/effects; and resets the camera and renderer caches. Parameterize bounds, centers, autotiling, navigation, and map serialization instead of cropping the map. Scale population budgets by usable area for comparable density, retain normal placement/eligibility rules, and report actual counts. Authored prefabs keep their dimensions; disable regeneration inside them with an explanation. A generation failure retains the previous experiment.

| Control | Choices | Behavior |
| --- | --- | --- |
| Draw region | Camera / 20x20 | Intersect camera bounds with an exact player-centered 20x20-cell rectangle, clipped at map edges. Exclude outside cells before preparation and GPU submission, including partial static chunks. |
| Animation | Full / Static | Freeze sprite frames, hops, pickup oscillation, and cosmetic clocks. Player travel and camera following remain active. |
| Dynamic visuals | On / Off | Off draws only local terrain/walls and the player. Simulation, collisions, enemies, and turns remain authoritative. |
| Minimap | Live / Frozen / Off | Freeze the last snapshot or disable its work. Resuming reconciles current state. |
| Simulation | Live / Frozen | Preserve player travel, collision checks, camera, and rendering; suppress time advancement, enemy/projectile turns, encounter progression, and periodic simulation callbacks. |

Use existing mute controls for the audio comparison. Simulation Frozen is independent of Animation Static: enemies can remain visually animated while their authoritative turns are paused. Disable the bypass outside the temporary session. Freeze at a committed action boundary, discard no already committed actions, and resume without accumulating or replaying skipped ticks. Prevent periodic hazard/encounter callbacks from mutating the world while frozen. Keep player movement and collision checks active; reject non-movement state-changing interactions during the frozen diagnostic with a visible explanation. Use an interaction-free route for the comparison. On resume, use the current player position and resume normal rules without catch-up.

Measure total action time and nested clone/upgrade, tick, AI, navigation, save serialization/storage, and React/presentation phases separately. Track tick count, enemy visits, and worst action duration as well as frame intervals. Do not sum inclusive nested timers as if they were exclusive. Keep cloning, collision, and presentation costs visible in Frozen mode: no frame-time improvement rules out neither those CPU costs nor a small simulation contribution hidden behind a larger renderer cost. A large improvement implicates the suppressed simulation phases, which the timing breakdown must then identify.

### Quick comparison protocol

Expose FPS, median/p95 display-frame intervals, CPU preparation time, static compilations, model builds, discovery decodes, visited cells, active layers/sprites, sprite patches, and minimap uploads. Track domain-action and save time separately. Publish metrics at most once per second and measure their overhead. Record source revision/dirty state, browser/device/GPU when available, viewport/backing size, DPR, refresh cadence, seed, dimensions, entity counts, movement/camera mode, and zoom. CPU preparation timing is not GPU execution timing.

Use seed 17, level 1, 100x100, native zoom, Center camera, gridless movement, and fixed character/world settings. Derive a reachable entrance route once and retain its cell sequence. If interactions obstruct it, record one alternative route before comparisons. Each quick sample warms up for five seconds and runs the same route for ten seconds after resetting the reference. Other dimensions need their own recorded deterministic entrance routes because topology changes.

Run one baseline, then one pass each for minimap off, static animation, 20x20, dynamic visuals off, simulation frozen, and the two alternate sizes. Change one variable per comparison and reuse the normal-size baseline. Repeat the same route from the same reference state for Live/Frozen, keeping rendering settings identical; verify frozen time and enemy state remain unchanged while player pixels move. Run the combined minimal mode last, explicitly recording simulation state. Size changes topology/population as well as cells, so treat it as scaling evidence rather than proof of one cause. Compare frame times: roughly 2x throughput or at least 30% lower p95 is a useful large-win signal, not a release gate. Record smaller/negative results honestly. A 60 Hz environment cannot validate 120 presented FPS.

### Bounded GPU and worker experiments

After the initial fixes and static-world cloning optimization, timebox each prototype to one implementation session and one native-zoom reference comparison. Record keep/discard and complete costs. Retain a candidate only for a large measured win or removal of a demonstrated long stall without harming sustained frames; otherwise remove prototype code and retain its report.

- GPU: try batching compatible sprites or cached chunk composition to reduce submissions. Preserve wall-row depth and adjacent shadow/main pairs; never flatten walls over actors. A tile-index texture plus atlas lookup through the installed fragment-shader/extra-texture API is a candidate when it removes per-tile submission work. Reject seams, blur, or incorrect depth. The verified custom sprite hook is fragment-only; do not promise vertex animation or GPU simulation. Shaders cannot fix repeated CPU model construction by themselves.
- Worker: prototype static semantic/minimap typed-buffer preparation in a module worker, with transferable buffers, revision-tagged requests, stale-result rejection, and last-valid presentation while work completes. Include transfer/scheduling latency; never send the full campaign every frame. Full engine migration to OffscreenCanvas is assessed and documented only here because shared-device ownership, DOM sizing/input, React overlays, and texture loading require a larger change. If workers are unavailable, record that result and keep the optimized main-thread path.
- CPU simulation: use the early Live/Frozen result to decide whether background simulation merits a bounded feasibility experiment. An `async` function or Promise still runs CPU work on the main thread unless the work is moved or cooperatively divided. Compare a worker-owned serial action queue with cooperative scheduling at safe transaction boundaries. Preserve deterministic event order, one authoritative state writer, input ordering, save-after-commit, and stale-result rejection on session/floor changes. Never render or save a half-applied turn. Include message-copy/transfer latency and player-input delay. The early playtest receives the diagnostic and measurements, not an unmeasured asynchronous simulation rewrite.

### Approved continuation through finalization

The first controls and playable URL were delivered. On 2026-10-23 the user explicitly approved continuing through all tasks rather than waiting for another playtest. Record that authorization without claiming human-observed visual acceptance. Keep normal presentation defaults and existing gameplay rules. Implement static-world sharing first, compare its route timings, then run bounded prototypes, retain measured winners, and complete three-context verification, the all-zoom profile, npm tests/typecheck and full applicable browser coverage.

## Risks / Trade-offs

- [Chunk seams or stale static cache] → Key cache entries by floor identity/static revision and validate chunk boundaries with terrain tests.
- [Culling misses edge sprites] → Expand visible bounds by one tile/chunk margin.
- [Variable dimensions expose hardcoded assumptions] → Check entrance/exit connectivity and all placement bounds for each size; keep authored prefab dimensions fixed.
- [Stale caches or worker results] → Use explicit revisions, stale-response rejection, bounded cache lifetimes, and focused floor-change tests.
- [Experiment progress overwrites a save] → Enforce temporary-session ownership at every persistence entry point and verify saved bytes remain unchanged.
- [Individual decals raise temporary layer count] → Cap only by natural ten-second expiry and cull offscreen visuals; do not batch their lifetime.
- [Frame target varies by device] → Record the reference browser/device and measured running frame data; use 120 FPS as a target, not a binary release criterion.

## Migration Plan

Preserve completed task history and carry the original two outstanding checks into finalization. Normal saves retain their schema and normal dimensions; experiment dimensions remain session-only. Keep the working renderer during bounded comparisons, then remove losing candidates. Tear down workers and release textures on session/floor changes. No production code changes occur during proposal authoring.

## Open Questions

Measured prototype outcomes and the player's preferred visual trade-offs will be recorded at the explicit playtest/experiment checkpoints. They determine which eligible optimization to retain, not whether to implement fog or lighting.
