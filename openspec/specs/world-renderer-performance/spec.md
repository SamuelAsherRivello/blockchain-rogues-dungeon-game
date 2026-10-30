# world-renderer-performance Specification

## Purpose
Defines efficient dungeon-world presentation and developer experiments that identify major frame-time costs while retaining correct normal gameplay.

## Requirements

### Requirement: Compile static world presentation outside the frame loop
The renderer SHALL derive immutable terrain, wall, and static-prop tile presentation from a floor's static world data when that data is created or explicitly invalidated, not once per animation frame.

#### Scenario: Present an unchanged floor
- **WHEN** consecutive frames render an unchanged floor
- **THEN** the selected terrain and wall tile presentation remains stable without recompiling its static world data

#### Scenario: Enter a generated floor
- **WHEN** the active floor changes
- **THEN** the renderer compiles and presents that floor's static world data without stale content from the prior floor

### Requirement: Limit presentation work to visible world cells
The game view SHALL present static chunks and dynamic visuals only when they intersect the camera-visible world area, while preserving in-bounds camera framing and world-depth ordering for visible content.

#### Scenario: Move the camera across a large floor
- **WHEN** the camera changes its visible cell area
- **THEN** newly visible content appears at its correct world position and offscreen content is not drawn

### Requirement: Deactivate culled presentation work
The renderer SHALL deactivate every static chunk and dynamic visual outside the camera-visible area and SHALL skip its sprite updates and animation sampling until it becomes visible again.

#### Scenario: Sustain player running
- **WHEN** the player runs continuously through a large floor at any supported zoom
- **THEN** offscreen presentation work remains inactive and profiling reports sustained-running frame performance toward the 120 FPS optimization target

### Requirement: Keep landed combat marks independently transient
Each landed combat mark SHALL keep its own fade timeline, remain independently positioned, and be removed ten seconds after it lands.

#### Scenario: Land combat marks at different times
- **WHEN** two combat marks land at different times
- **THEN** each fades and is removed ten seconds after its own landing time without changing the other mark's lifetime

### Requirement: Keep ordinary frame preparation local to visible content
During movement or animation in unchanged geometry, presentation SHALL reuse static data, limit dynamic queries to the selected draw region, and avoid full-floor model reconstruction or repeated decoding of unchanged discovery data. Each view SHALL prepare at most once per display frame.

#### Scenario: Animate without changing geometry
- **WHEN** animation and player presentation advance without geometry, semantic-state, or discovery changes
- **THEN** full-floor preparation and discovery decoding counters stay unchanged while visible visuals update

#### Scenario: Move while the camera follows
- **WHEN** movement notifications and camera animation occur in the same display frame
- **THEN** they produce one presentation preparation for each active view

### Requirement: Regenerate developer worlds at explicit sizes
Developer performance mode SHALL offer a World Size control cycling 100x100, 50x50, and 200x200 cells. Selecting a size SHALL regenerate the seeded scenario and place the player at its entrance. The temporary session SHALL show dimensions and object counts, preserve normal saves, and support returning to the original campaign.

#### Scenario: Cycle world size
- **WHEN** the developer clicks World Size
- **THEN** the next dimensions appear, the scenario regenerates with the same seed and generation settings, and the player returns to the entrance

#### Scenario: Leave the experiment
- **WHEN** the developer exits performance mode or reloads
- **THEN** the normal saved campaign remains available without experiment progress replacing it

#### Scenario: Size regeneration is unavailable
- **WHEN** the player is inside an authored prefab or generation fails
- **THEN** the developer sees the reason and the existing campaign is retained

### Requirement: Isolate major presentation costs with developer controls
Developer performance mode SHALL independently control draw region, animation, dynamic visuals, and minimap activity. It SHALL offer the normal camera region or a centered 20x20-cell region, full or static animation, dynamic visuals on or off, and a live, frozen, or disabled minimap. These presentation controls SHALL leave simulation rules unchanged; Simulation Live/Frozen is a separate diagnostic.

#### Scenario: Render a minimal local scene
- **WHEN** the developer selects 20x20, static animation, dynamic visuals off, and minimap off
- **THEN** only local static terrain and the player render, the player still moves, and offscreen simulation remains authoritative

#### Scenario: Restore normal presentation
- **WHEN** the developer restores the normal settings
- **THEN** current objects and animated visuals return at correct positions without resetting gameplay

### Requirement: Report reproducible performance comparisons
Performance mode SHALL report FPS, median and p95 frame intervals, preparation time, and work counters with the active seed, dimensions, zoom, and settings. Comparisons SHALL use the same short scenario and seek large gains toward 120 FPS without requiring a locked frame rate.

#### Scenario: Compare one setting
- **WHEN** a developer runs the baseline and one isolated variant
- **THEN** the report records both configurations, frame-time differences, work counts, and browser/device context without claiming an unmeasured GPU gain

### Requirement: Isolate CPU simulation during developer movement
The temporary performance session SHALL offer Simulation Live/Frozen independently of visual settings. Frozen SHALL preserve player travel, collisions, camera, and rendering while suppressing time advancement, enemy/projectile turns, encounter progression, and periodic simulation mutations. Normal sessions SHALL retain their existing simulation rules.

#### Scenario: Move while simulation is frozen
- **WHEN** the developer selects Frozen and traverses the recorded interaction-free route
- **THEN** player position and camera update while time, enemy positions, projectile state, and encounter progression remain unchanged
- **AND** tick and enemy-update counters remain zero while action and presentation timings are still reported

#### Scenario: Attempt an interaction while frozen
- **WHEN** the developer requests a non-movement state-changing interaction in Frozen mode
- **THEN** the action is rejected with an explanation and does not mutate simulation state

#### Scenario: Resume live simulation
- **WHEN** the developer selects Live or exits the temporary session
- **THEN** normal simulation resumes without replaying skipped ticks or allowing experiment state to overwrite normal saves

### Requirement: Distinguish simulation costs in performance reports
The performance report SHALL include CPU action, clone/upgrade, tick/AI, navigation, save, and presentation timings with tick/entity-visit counts. It SHALL compare the same movement scenario in Live and Frozen with identical visual settings and distinguish nested timing scopes.

#### Scenario: Compare simulation modes
- **WHEN** the developer completes the Live and Frozen samples
- **THEN** the report records frame intervals, action/tick/AI costs, and suppressed-work counts for both
- **AND** no improvement is described as evidence against a major tick bottleneck in that sample, not proof that all movement CPU work is cheap

### Requirement: Movement copies exclude immutable world geometry
Ordinary authoritative-session movement SHALL copy mutable campaign state without copying or scanning unchanged static terrain, legacy numeric grids or authored tile layers. Active, visited and recovery floors SHALL retain immutable static references while mutable entities, encounters and player state remain independently owned. Legacy/import/repair boundaries SHALL still normalize replaced geometry, and saves and event order SHALL remain compatible.

#### Scenario: Advance movement or a turn in unchanged geometry
- **WHEN** an authoritative session applies movement or a turn without changing geometry
- **THEN** no full static grid is deep-copied, reconstructed or normalized
- **AND** changing mutable result state cannot mutate the preceding campaign or its recovery snapshots

#### Scenario: Import or repair geometry
- **WHEN** a session starts from legacy data or replaces a floor with repaired geometry
- **THEN** the new geometry is normalized at that boundary and renderer caches use the replacement references

#### Scenario: Preserve action semantics and persistence
- **WHEN** the same seeded actions execute with static sharing
- **THEN** results and ordered events match the full-copy control and save/reload retains the same campaign state

### Requirement: Compare fog and lighting through Render Test
Developer settings SHALL provide a live button labeled `RT:<mode>` cycling 0, 1, 2, 3, then 0. Mode 0 SHALL disable both effects, 1 SHALL enable fog only, 2 SHALL enable lighting only, and 3 SHALL enable both. A fresh page SHALL default to 3. The tooltip SHALL explain the mapping. The override SHALL be session-only and independent of the shader selector and temporary performance session.

#### Scenario: Cycle all effect combinations
- **WHEN** the developer clicks RT repeatedly
- **THEN** its label and effective combination follow the documented cycle without reloading the campaign or advancing time

#### Scenario: Reload after a diagnostic
- **WHEN** the page reloads after using RT 0, 1, or 2
- **THEN** normal play resumes with both effects enabled at RT 3
- **AND** the diagnostic value is absent from campaign saves, checkpoints, player preferences, and shared run identity

#### Scenario: Compare during Battle
- **WHEN** RT changes during Battle
- **THEN** tactical dimming remains active above whichever fog and lighting effects are enabled

### Requirement: Skip disabled effect work
Fog-disabled presentation SHALL bypass fog-mask preparation and submission, and lighting-disabled presentation SHALL bypass illumination calculation, uploads, and shading. Ordinary position-based discovery and enemy detection SHALL continue in every mode. Re-enabling an effect SHALL reconcile current state without replaying missed actions.

#### Scenario: Measure the both-off baseline
- **WHEN** RT 0 is active after its transition settles
- **THEN** fog rendering and lighting work counters remain zero while gameplay continues normally

#### Scenario: Re-enable after movement
- **WHEN** the player moves in RT 0 and changes to RT 3
- **THEN** fog reflects earned exploration and illumination reflects current sources and blockers
- **AND** no stale source buffers or diagnostic full-map knowledge appear

### Requirement: Bound effect updates independently of static geometry
Fog and lighting SHALL reuse retained world geometry and cached unchanged data. Idle animation SHALL NOT repeatedly decode discovery, rebuild static light visibility, or scan the whole floor for player light. Updates SHALL be coalesced with the existing per-view frame preparation, and departed realm resources SHALL be released.

#### Scenario: Animate in unchanged terrain
- **WHEN** only cosmetic animations advance
- **THEN** static-compilation, discovery-decode, and unchanged static-light visibility counters do not increase

#### Scenario: Turn at the same position
- **WHEN** heading changes without discovery or blocker changes
- **THEN** the forward contribution updates without rebuilding geometry, exploration, or unrelated static lights

### Requirement: Report Render Test performance with combined mode enabled
Performance comparisons SHALL report all four RT modes on the same seeded route with matching non-RT settings. Reports SHALL include mode, source and discovery counts, frame intervals, effect preparation times, texture uploads, and geometry rebuild counts. Combined RT 3 SHALL be profiled and visually verified toward the existing 120 FPS target without treating that target as a hardware-independent guarantee.

#### Scenario: Record an isolated comparison
- **WHEN** the four RT samples are recorded
- **THEN** the report identifies seed, starting state, route, dimensions, zoom, shader, simulation, minimap, viewport, DPR, browser/device context, actual topology family/geometry hash, isolated input fixture and frozen runtime source manifest
- **AND** each sample starts from the same exploration state rather than benefiting from a previously explored route
- **AND** scripted keyboard sampling suppresses real gamepad input only in the disposable test context, records that fixture choice and preserves player preferences
- **AND** runtime source changes or a route that differs from its declared accepted steps invalidate the sample

#### Scenario: Check larger-floor scaling
- **WHEN** a 200x200 comparison is recorded with RT 0 and RT 3
- **THEN** the report separates effect cost from simulation and save cost and records whether whole-floor work or uploads grew
