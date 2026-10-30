# Design

## Context

See `proposal.md` for motivation and the delta specs for observable behavior. Design is required because this change spans persistence, renderer composition, input presentation, and performance.

Observed integration points:

- `world-procedural-system.ts` stores discovery as a `Record<string, string>` of dimension-prefixed row-major bitmaps. `activeDiscoveryKey` currently uses only the level number; `revealDiscovery` adds a radius-one square, and the decoder caches unchanged records. Prefab entry changes the active floor without an independent discovery identity or an arrival reveal. These are integration gaps when enabling real fog.
- `buildDeathRecovery` restores a Journey checkpoint and clears Adventure discovery. Existing specs and focused recovery tests agree. These policies remain authoritative; retaining post-checkpoint Journey exploration is outside this change.
- `world-render-system.ts` retains static tile presentation and spatial buckets. Static geometry is deliberately not filtered by discovery. The current Babylon game and minimap paths request semantic objects with discovery bypassed, so enabling fog requires an actual presentation gate, not merely changing the existing helper type.
- `babylon-render-system.tsx` uses camera-culled 16-cell chunks, row-grouped walls, pooled actors, and separate game/minimap preparation. The minimap retains a generated semantic texture. Existing stair clipping uses a custom sprite shader.
- Babylon Lite 1.32.0 locally exposes `createDynamicTexture`, `updateDynamicTexture`, custom sprite fragment shaders, extra sampled textures, and sprite tint colors. Its inspected dynamic texture update options do not promise partial-region uploads. Do not design around an unavailable subregion upload API.
- `StatusControls` in `game.tsx` owns developer controls under `canOverride`; `dev-settings.ts` owns existing persisted development preferences. `performance-system.ts` only collects metrics inside the explicit temporary performance session. The existing `S` selector is a canvas color treatment, not the new RT switch.
- `TacticalAreaOverlay` is an SVG above the game canvas. It applies one existing dark overlay outside the union of tactical rectangles. The user confirmed on 2026-10-25 that this gameplay dimming takes precedence over the new lighting.
- The checkout includes unrelated dialog/UI work. Apply must preserve it and avoid rewriting whole components from an old snapshot.

## Goals / Non-Goals

**Goals:** Keep exploration, lighting, detection, and tactical attenuation separately owned; ship the combined-on path as the ordinary default; make RT comparisons isolate actual effect work; retain cached terrain and existing world coordinates.

**Non-Goals:** Engine lights, normal maps, physical bounce lighting, new torch inventory mechanics, sunlight/shadow simulation, enemy facing restrictions, a new look-around action, a renderer migration, new procedural art, last-observed snapshots of movable props, or changed death contracts. Narrower beams and sub-tile lighting are future visual options, not additional modes to implement now.

## Decisions

### 1. Separate persisted knowledge from derived rendering

Keep the discovery bitmap in the campaign. Add a renderer-neutral exploration helper with one active-realm identity function used by reveal, lookup, coverage, game view, minimap, transitions, and save migration. Suggested new modules are `map-discovery-system.ts` and `grid-lighting-system.ts`; keep Babylon and React imports out of them.

Use canonical discovery keys including campaign world/run identity, realm kind, dungeon level or prefab ID, floor seed, and dimensions. Slot isolation comes from the campaign record itself. This prevents a home prefab from reading the dungeon's bits simply because both currently use level 1. Reconstructing the same deterministic realm must reproduce its key. A new identity starts empty; returning to the same identity reuses its bits.

Preserve the dimension-prefixed bitmap encoding and support the existing numeric level keys through a lazy compatible read. Import a legacy record only into its matching dungeon context after validating dimensions and the campaign's retained floor identity. Never reinterpret an ambiguous legacy dungeon bitmap as home-prefab knowledge. Keep original saved bytes under the existing migration/backup conventions before rewriting a record. Apply the same normalization to recovery snapshots without mutating them through shared bitmap buffers.

Alternative: retain level-only keys. Rejected because standalone prefab coordinates already alias a dungeon level. A new field containing duplicate live visibility and light maps is also rejected; both are derived and would complicate recovery.

### 2. Use an independent position-based reveal brush

Start with a rounded radius-four reveal brush, independent of the light radii below. Include cells whose centers are within `radius + 0.5` tile units, clipped to map bounds. Reveal from accepted player position changes and realm arrival, including prefab entry and return. The brush crosses walls, matching the position-only exploration model and avoiding an unrequested LOS rule for fog. Keep a single tuning definition so radius and shape can be adjusted without changing persistence.

Knowledge changes only when new bits are added. Do not re-encode an unchanged bitmap on idle animation or turning. Continue tracking discovery under every RT value, including diagnostic movement that legitimately changes player position. Coverage keeps the existing active-grid denominator; a fully set bitmap reports 100 percent, without asserting every generated map permits reaching every counted cell.

Journey restores checkpoint bits; Adventure clears bits and applies the normal arrival reveal; Classic has no recovery. Save/reload and ordinary return travel preserve compatible knowledge. This is a two-state exploration mask, not an RTS visibility state that re-fogs visited cells when the player walks away.

Alternative: derive discovery from light or enemy detection. Rejected because torches, facing, and Perception must not grant exploration progress.

### 3. Compute bounded direct-light fields on the grid

Start with one sample per world tile. Visual tuning uses surrounding radius 3, forward radius 6 with a 180-degree half-plane, and a subdued neutral/cool ambient floor around 0.3. Per the user's screenshot review, wall torches, authored home torches and campfires share radius 5 and RGB (0.90, 0.58, 0.25) through `CAMPFIRE_LIGHT`. These are implementation tuning values, not new player settings. Use a rounded surrounding footprint and monotonic falloff; sum source RGB contributions and clamp the final illumination to the supported range. Falloff is centered on each actual fixture; a mounted torch's `castFrom` shifts only occlusion traversal to its exposed side. Wall-anchored artwork receives the strongest incident surface contribution at its anchor. Wall geometry selects an exposed viewer-facing surface, preserving opposite-face occlusion. Existing art and source sprites remain unchanged.

Use the existing four-way character heading, including its established diagonal tie behavior. Do not add diagonal combat headings to mimic the reference image. Only accepted heading changes redirect player light.

Build a reusable blocker lookup from nonwalkable terrain and current closed-door states. Initially use bounded cell-center traversal matching the existing LOS corner convention for the short light radii. Allow the first opaque endpoint to receive light, then stop. This is a lighting traversal policy; it must not change `hasPerceptionLineOfSight` results. Use receiver-face information for opaque walls so a source behind a wall does not brighten its near face. A mounted torch selects its emitting face from adjacent walkable terrain with a stable north/east/south/west tie order; use that face's emission point for occlusion and retain its authored sprite position. Cache source footprints by source and blocker revisions.

Doorway behavior follows geometry: walls clip a broad beam to the opening, and more room cells become directly reachable as the player enters. Do not reveal or light the whole room on entry. Existing torches and campfires supply environmental sources without changing generation passes or adding nearby-start substitutes.

Alternatives: flood fill can propagate around corners and does not match direct-light shadows; a global engine light system changes the renderer unnecessarily. Symmetric shadowcasting remains a later replacement if measured ranges require it and equivalent corner behavior is proved.

### 4. Retain geometry and update presentation fields separately

Use a small sampled field for floor presentation, with RGB illumination and an exploration channel. The floor fragment shader samples the owning world cell using the existing view transform, not screen-fixed coordinates. Reuse the texture and shader descriptors across compatible layers. A 100x100 RGBA field is 40,000 bytes and a 200x200 field is 160,000 bytes before GPU alignment; report actual upload cost rather than assuming it is free.

Keep CPU dirty regions and receiver data independent of the terrain model. A player-cell change updates the union of old/new bounded light footprints. A heading change updates the forward footprint. Static source visibility is refreshed only when its source or relevant opacity changes. Prepare a changed field at most once in the existing frame scheduler. The installed public API can upload the small field as a whole on a dirty revision; this does not justify rescanning the entire floor or uploading every idle frame. Measure upload bytes/counts explicitly before adding complexity.

Walls, characters, props, shadows, and effects use their world anchor's visibility and illumination. Apply existing sprite tint/visibility updates only when their sampled value changes or their normal movement update already needs a patch. This avoids screen-space fog slicing an oversized character's head. Walls use their owning tile and receiver face, not the image's overhanging pixel row. Keep shadow/main pairs and wall-quarter ownership consistent. Floor mask sampling and anchored sprite tinting share the same CPU field and permission policy.

Use committed grid state for discovery and occlusion revisions. Grid-tween presentation continues to use the shared displayed actor positions for actor tint sampling and camera projection. The grid lighting is allowed to change on committed cell boundaries; it must remain stable in world coordinates during the existing travel tween. Do not add per-pixel LOS recalculation or advance simulation to smooth it. Suppress an interpolated enemy whenever its committed detection or presented anchor's fog permission is absent.

RT 0 binds no fog/light field shader and skips both effect preparations. RT 1 prepares only discovery presentation and uses identity RGB. RT 2 prepares only illumination and uses an always-permitted exploration channel. RT 3 prepares both. Shared texture work in a single-effect mode belongs to that enabled effect's counters; a disabled effect must not secretly run to populate unused channels. Dispose textures, cached receivers, and source records on realm replacement or renderer teardown, and reconstruct current data when a disabled effect is re-enabled.

Alternative: one overlay sprite/layer per fog or light cell. Rejected because it adds submissions and can cut through actors. Recoloring saved PNG files is also rejected; tinting is a runtime operation.

### 5. Compose gameplay precedence explicitly

The pipeline is world art with illumination, exploration concealment, optional existing canvas color treatment, then the existing tactical SVG attenuation. Persistent HUD and readable screen overlays retain their current layering. The SVG has no additive light pass above it. Its tactical union, extra artwork row, wall/door checks, and non-overlapping attenuation remain unchanged.

Replace the obsolete literal 'exactly two brightness zones' contract with 'exactly two tactical attenuation classes.' A bright torch outside the tactical area still receives the existing non-tactical dimming. The overlay does not brighten unknown cells or override fog permissions. Where its rectangle would identify an enemy through unknown space, suppress that identifying hint without changing the underlying Battle state or combat calculation. Apply and measure the same tactical behavior in every RT mode; RT never disables this gameplay overlay.

Keep detection IDs independent of illumination and exploration. Visible enemies require both existing detection and permission from the enabled view mask. Turning, changing ambient color, or selecting RT does not change the detected-ID set, awareness, or defensive heading rules. A bright but low-Perception enemy stays hidden, and fog-off is not an enemy-reveal cheat.

### 6. Keep game, minimap, and interactions consistent

Use the same discovery identity and permission helper for game terrain, anchored world entries, the semantic minimap, and recap. The minimap retains semantic colors and does not sample scene lighting. New discovery can dirty its background; actor-only movement does not repaint its static terrain. Hidden minimaps do no preparation and reconcile once when shown. A death recap always uses actual knowledge, even after RT 0 or 2. Create World deliberately requests a complete unlit preview without changing campaign discovery.

Mouse walking can target and cross reachable unknown or dark cells under the normal travel budget, terrain and occupancy rules. Discovery and illumination do not block destination selection or clip the route. Ordinary walk targets use the same white reticle, white route dots and boot cursor on revealed and fogged terrain. This neutral navigation preview is permitted inside fog; it does not reveal world artwork, target identities or object/hazard/enemy indicators.

Reticles, tooltips and action selection must still consult presentation permission before resolving identifying world contents. A concealed-target click carries walking intent only and cannot become a queued attack, pickup, bump interaction or other object action as the route reveals more cells. Normal collision and the existing restrictions on detected/revealed actions remain authoritative. Hovering or selecting a destination does not grant discovery; accepted movement and arrival apply the usual reveal brush. Directional controls, authoritative A*, collision, enemy behavior and turn resolution remain unchanged.

No last-observed prop snapshots are added. Revealed non-enemy objects retain the existing live-world representation; the system tracks exploration, not a simulation of the player's remembered door/barrel states.

### 7. Make RT a production-safe diagnostic

Add `RenderTestMode = 0 | 1 | 2 | 3` and pure validation/cycle/effect-selection helpers in `render-test-system.ts`. Initialize React session state to 3. `StatusControls` renders `RT:<mode>` alongside existing developer controls with a tooltip spelling out all four combinations. The mapping uses bit 0 for fog and bit 1 for lighting. Invalid values normalize to 3.

The control is available under existing developer eligibility, independently of `P` and `S`. Do not add its value to localStorage, campaign state, checkpoint state, user preferences, or share URLs. Remounting a renderer or entering/exiting Perf within the same page retains the selected RT value; a fresh page returns to 3. Views without an explicit diagnostic override use production defaults. Disabling or hiding developer eligibility restores effective mode 3 rather than retaining a hidden off override.

Metric reset is allowed on a mode change, but do not dispatch a gameplay action or autosave. Normal discovery on subsequent movement remains part of the domain baseline in every sample. Temporary Perf campaigns retain their established ownership and must not overwrite normal saved bytes.

### 8. Verify the combined-on path and report actual cost

Add focused pure tests for reveal independence, realm identity/migration, recovery, falloff, opaque endpoints/corners, door revisions, source overlap, RT cycling, zero disabled-effect work, and retained geometry. Include disclosure checks for oversized sprites, hover, paths, projectiles/effects, minimap, and recap. Navigation checks must cover reachable unknown destinations, known destinations reached across unknown cells, matching white reticle/dots/boot presentation, and concealed-target walking that cannot trigger attacks or object actions, including when the route reveals the target. Verify the supported movement modes and normal travel limits without treating the superseded fog-clipping behavior as acceptance.

After integration, perform one focused muted Playwright CLI Microsoft Edge check covering all four RT modes, a doorway, Battle precedence, camera travel, preview/minimap, and save/return behavior. Finalization runs `npm test`, `npm run typecheck`, the required Edge CLI/desktop Edge/IAB checks, and the applicable full browser suite once after stopping the owned preview server. Report unavailable capabilities and failures accurately.

Use the existing Perf instrumentation for CPU times, frame intervals, geometry rebuilds, source/receiver cell visits, fog/light preparation, and upload counts/bytes. Sample seed 17 with a recorded route at 100x100 and native zoom: five-second warmup, ten-second route, same initial discovery/state for RT 0/1/2/3. Reset the temporary campaign before each sample; do not accumulate exploration between samples. Record simulation/minimap/shader, dimensions, viewport, DPR, browser/device, actual topology family and geometry hash, source count, discovery coverage, and frame cadence. Record an isolated scripted-keyboard fixture that suppresses gamepad input only in the disposable browser context, without changing player preferences or production input behavior. Pin the complete relevant runtime manifest before recording and reject samples when source changes. Add RT 0 versus 3 at 200x200 as a bounded scaling check. Verify supported zooms and both aspects visually without multiplying the performance experiment into a large matrix.

Report RT 3 minus RT 0 CPU/frame costs and the isolated fog/light samples. The existing 120 FPS / 8.33 ms target is an optimization goal, not a measured outcome or hardware-independent pass gate. Correctness and zero disabled/stale work are acceptance gates. Keep both effects enabled after tuning; do not solve a regression by changing production defaults to off.

## Risks / Trade-offs

- Tactical contrast competes with atmospheric contrast. Retain the existing final overlay and inspect a torch outside the tactical area during Battle; do not add a light pass above it.
- Whole-field texture uploads may cost more than their byte count suggests. Upload only dirty revisions, instrument actual cost, and bound CPU updates. Keep any further GPU optimization tied to the comparison rather than introducing a worker or undocumented API.
- Position-based exploration can reveal through a thin wall. This is the chosen fog model; direct light and enemy LOS still stop at the wall. Narrower reveal tuning can be adjusted without coupling the systems.
- Existing legacy discovery is keyed too broadly. Validate dimensions/realm context, preserve saved bytes before migration, and test home/dungeon return and recovery snapshots separately.
- Light changes on grid commits can look stepped beside tweened movement. This is compatible with the initial tile-based style; tune falloff before adding a different visibility or movement model.
- Bright and dark tiles do not guarantee enemy presence or absence. Preserve existing detection and identifying presentation restrictions in every RT mode.

## Migration Plan

1. Introduce compatible realm-aware discovery reads and focused save/recovery tests before enabling its presentation. Preserve original save backups and the normal migration failure behavior.
2. Integrate derived light/fog state and RT controls with effective mode 3 as the default. Adapt tests that assumed the whole dungeon was visible; use explicit diagnostic or preview contexts only when the test actually requires them.
3. Run focused integration, compare RT samples, and complete finalization. Record current source state because other changes can share this checkout.
4. RT 0 is a temporary presentation fallback for diagnosis, not a persistence rollback or a production release configuration. If a code rollback is required, preserve original discovery backups and never overwrite saves with regenerated knowledge. No generated OpenSpec skills, repository settings, or deployment changes belong to implementation.

## Open Questions

Only visual tuning remains deferrable: exact ambient RGB, light intensity/falloff bands, and the initial reveal radius within the independently configured brush. The implementation has concrete starting values above. Narrower cones, finer light grids, persistent RT preferences, and retaining Journey knowledge earned after its checkpoint are outside this plan.
