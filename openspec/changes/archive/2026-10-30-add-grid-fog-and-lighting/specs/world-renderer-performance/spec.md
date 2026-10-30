# Spec Delta

## ADDED Requirements

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
