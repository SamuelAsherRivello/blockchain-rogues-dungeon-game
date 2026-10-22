# Apply verification

Owner: `01a16a3c-f8f6-76e2-ab27-0216debd3630`, coordinated by `01a17384-49d7-78c2-ab8d-a242e90b3156` under `all-active-proposals`. Shared checkout on main; unrelated edits retained. No commits, branches or server lifecycle changes.

## Baseline

Before implementation, SHA256:

- `world-procedural-system.ts`: `E4C71F8855BCA568FD4EF4694BE943A55C706D610C14337C69FE64587497BF80`
- `save-system.ts`: `728555777EFD899047AD3318F898BABC4C9D2D8A8A8043A28E8433528EA6211A`

## Discovery

`node --import tsx --test rogues-dungeon/test/map-discovery-system.test.ts rogues-dungeon/test/death-recovery.test.ts`: 17 passed, 0 failed. Covers rounded bounds, unchanged-record reuse, facing/Perception independence, realm/run/seed separation, malformed dimensions/payload, buffer isolation, full coverage, save/reload, original legacy backup, Journey checkpoint rollback, Adventure arrival reveal, Classic termination and home/dungeon round trip with no extra ticks.

The existing recovery test's assertion that static geometry was filtered predated retained rendering. Updated it to assert retained geometry and semantic masking; fragment fog will mask the retained geometry during renderer integration.

Full browser suite remains pending coordinator-controlled server handoff. Preview on 6080 belongs to RUN; this owner must not stop it independently.

## Rendering and focused checks

- `npm test`: 363/363 passed after replacing four obsolete source assertions that required fog-free presentation. The added minimap/tactical and stair-return tests subsequently passed in their focused runs; the final complete gate remains pending.
- `npm run typecheck`: passed repeatedly through the integrated renderer/control/input edits.
- Edge CLI session `fog-lighting` uses an in-memory profile. A read-only storage check returned `keys: []` and all three slots empty before seeding its temporary slot 1. The seed script refuses occupied slots. No normal browser profile was modified.
- First focused rendering comparison: RT 3/0/1/2/3 produced distinct pixel results, no application errors, unchanged saved bytes during RT clicks, accepted keyboard travel from (50,50) to (50,49), and RT 3 after reload. See `output/fog-lighting-focused-result.log`.
- A follow-up review found a detached wall strip after RT cycling. Wall-quarter ownership was corrected and wall visibility/tint now update atomically, including zero alpha for unknown receivers. The explicit audit checks cells x58–61/y52–55, all undiscovered, through 3/0/1/2/3. Every fog-on sampled pixel is exactly RGBA (0,0,0,255); fog-off samples contain the wall artwork. See `output/fog-lighting-wall-audit-result.log` and its screenshots. Earlier mode screenshots are superseded.
- A first six-sample profiling attempt is invalid: it dynamically imported an inactive metrics-module instance, reporting disabled recording and zero frames. Retain `output/fog-lighting-profile-result.log` as failed diagnostic evidence. A repeated run resolves the exact module URL imported by the live game, verifies enabled recording and nonzero warmup/sample frames, and checks saved-byte isolation. Its final acceptance is pending review of the completed samples.

Stable source hashes before the corrected profiling run:

- `babylon-render-system.tsx`: `70F6EAA02E4FC386A2F5B4594B503CE940CE1CD6B04A2C39478F2658586AC19B`
- `grid-lighting-system.ts`: `A04EC30950E0AB033CA7D8340ABFD3B553B09E6CBFB79C5CAA271E97993685D8`
- `world-presentation-field.ts`: `D1715F89AED81C6530BFFA7449F846D87CEC1E953B9A23367269F337B51001CB`

The hashes above describe the intermediate capture only. The accepted matrix contains its own source manifest in `rogues-dungeon/documentation/fog-and-lighting-performance.json`.

## Accepted profiling and tuning

`output/fog-lighting-profile-final-source-result.log` is the accepted final six-sample run, including the registered start-room layer integration and final save/tactical guards. The prior `fog-lighting-profile-verified-result.log` remains historical evidence. All samples assert actual renderer mode and recorded RT counter, enabled recording, nonzero frames, exactly twenty explicit steps, return to the starting position and unchanged normal-save bytes. Each starts with 69 discovered cells; all finish with 109 cells. The four 100x100 samples have initial/final fingerprints 769291376/2527485810 and seven scene sources. The 200x200 pair has fingerprints 3208726137/22518023 and 38 sources. The raw JSON and `renderer-performance.md` contain all settings, counters, timing limits and CPU/frame results.

The earlier zero-frame attempt, first RT0 mode mismatch and held-key route captures are diagnostic evidence, not the accepted comparison. The mode mismatch came from converting a missing startup attribute with `Number(null)` and reading a renderer attribute before a previous click reached the next frame. The corrected script waits for explicit non-null mode transitions, then asserts mode after restart, warmup and recording. The application retains RT state through Perf changes.

The measured optimization resolves one immutable discovery reader for a view instead of redoing identity/encoding lookup per cell. A matched 200x200 semantic paint check (`output/fog-lighting-lookup-benchmark-result.log`) processes 5,562 terrain and 6,963 wall entries with two warmup paints and ten timed paints. The old lookup path averages 71.18 ms versus 0.44 ms for the retained reader. Both pixel hashes are 1171299123. This is CPU paint evidence, not GPU timing.

## Final visual integration

- `output/fog-lighting-integration-continue-result.log`: Perf mode retention, five zooms, three camera policies, S treatment, home entry/return and distinct persisted home/dungeon keys passed with no application errors.
- `output/fog-lighting-battle-recap-preview-continue-result.log`: existing generated torch at (50,34), player at (50,31); 223/223 bright sampled pixels match the final 44% tactical attenuation blend. Battle/tactical presentation remains active in all RT modes. Recap after RT0 forces fog, Journey restores 40 Health, Create World uses RT0 without writing slot 3, and no application errors occurred. The initial recap harness used Z (toggle controls); corrected to the documented X wait key.
- `output/fog-lighting-ready-layouts-result.log`: all 22 planned ring sprites are registered; ready landscape, portrait and fullscreen captures show the completed renderer at RT3. Earlier loading screenshots are superseded. In this headless Edge context, the fullscreen exit button did not settle before the harness timeout; verification exited via the browser fullscreen API and confirmed the ready windowed layout. No fullscreen production code was changed.
- The old program's start-room decoration allocation was unregistered. Its planned frames do not equal all canonical Wang frames, so claiming that the dead collection was already rendered would be incorrect. The final integration omits corresponding canonical ring sprites and registers the planned collection once in wall-row layers, with identical owning-cell fog permission, wall-face light tint and wall depth. Semantic minimap geometry and collision are unchanged. Renderer SHA256 after this integration: `57819DF832A3BFC43768FF43A629401170F20DED0E02039BAB982058D502DFB2`. The final performance matrix includes this integration and records its runtime source manifest.
- The earlier Node run passed 368/368 before the last two guards. A fresh final run is recorded below; historical success is not used as its substitute.

## Browser contexts and handoff

The final review reopened tasks 1.2 and 4.3 for two bounded edges. Both are fixed: the first saved-record rewrite preserves original bytes even with an older migration backup, and the tactical SVG paints only known cells. Focused persistence/recovery/presentation tests passed 26/26. `output/fog-lighting-final-tactical-result.log` verifies an active settled Battle leaves the unknown pixel at (59,53) exactly [0,0,0,255], RT3, with no application errors. The six-sample matrix was then repeated against the final registered renderer.

CLI Microsoft Edge and IAB both rendered the game and minimap with RT3, two canvases, no loading/unsupported-WebGPU message and no application errors. The IAB retained its existing S1 preference; verification used a complete-identity unsaved URL and did not touch normal slots. Desktop Edge through CUA was explicitly attempted and returned `Browser is not available: edge`; that required context is unavailable, not passed.

The final IAB refresh after the guards rendered two canvases, RT3, no loading/unsupported message and no console errors. Its ordinary seed-17 room registered 28 decoration sprites; the level1TestMode capture registers 22. Existing S1 preference was preserved and the complete-identity unsaved URL did not touch saved slots. Both owner-created Edge CLI and IAB contexts are closed.

The coordinator changed gate order: release shared runtime files after this final capture and focused checks, leave task 6.3 open, and run the full configured browser suite after diagnostic performance changes and generation milestone 2 stabilize. The coordinator will route integrated results and any owned failures back to this change. The RUN-owned 6080 server stays up until that coordinated stop. Disjoint unreferenced generation modules are excluded from the fog runtime manifest. No cross-chat messages, commits, pushes, archives or independent server stops were performed by this owner.

## Source ownership release

### Authorized fog-walk planning reconciliation

#### Focused verification in progress

After the coordinator released pure navigation work, the existing focused navigation/discovery/movement checks passed 33/33 (`output/fog-walk-focused-baseline.log`). A new regression then reproduced an uncovered hidden-action defect: select an empty unknown destination, let an enemy arrive after the destination becomes revealed, and the retained walking click emits an eastward action step into that enemy. `output/fog-walk-intent-regression-before.log` records the failing assertion. The test also covers object/pickup/barrel arrivals and stale route entry; a control preserves fresh revealed interactive selections. An initial test-fixture syntax error was corrected before this behavioral failure was recorded.

The coordinator has been notified in this chat before any runtime patch so integrated gates can be paused. Planned ownership is limited to mouse-selection walking intent and its focused regressions, preserving Game/gamepad/performance changes. No browser or FPS capture has been launched for this verification stage. Tasks 3.4 and 3.5 remain open.

The coordinator identified concurrent human-authorized gamepad/reticle work and completed portal, drag/swap and fog-walk changes, and is settling their source ownership before another capture. All browsers created by this owner are closed; rejected source/step captures remain rejected. No new CPU/browser tests or runtime edits are authorized until the coordinator releases the window.

The coordinator routed the complete human directives, which were independently read from the existing chat `01a1741c-451d-7fd0-8ec4-5ff547ef9a78`, titled `Allow walking into fogged tiles`. The first directive is in turn `01a1741d-1f38-72b1-86ee-5be17e2cc4df`, user message `01a1741d-27d3-7661-8d15-ebee3f614737`:

> Allow me to walk to a tile with mouse even if its fogged and dark. Do not aloow me to interact or attack such a tile, but walk there, yes

The presentation directive is in turn `01a17424-236f-71a1-8cbc-13115b987c77`, user message `01a17424-2742-7101-84fc-199ba78bd4b4`:

> great. but it must show the same presentation if I mouse to walk on or off the fogged.
>
> Both cases its a white reteicle and dots and the boot cursor

These explicit human decisions resolve the contradiction with the earlier plan. No additional approval or unresolved design choice is required. The exact narrow revisions were drafted in this chat before any artifact edits. Original-to-new rule mapping:

- Unknown destinations previously rejected mouse travel; reachable unknown/dark destinations now permit normal walking.
- Routes and previews previously stopped before the first unknown cell; neutral white previews and travel now cross discovery boundaries within normal terrain, occupancy and travel limits.
- Unknown hover previously omitted the ordinary walking preview/cursor; ordinary walking now uses the same white reticle, white dots and boot cursor on revealed and fogged terrain.
- Concealed enemy/object/hazard identity protection remains required. Hidden-target selections carry walking intent only, without authorizing or queuing attacks, pickups, bump interactions or other object actions, including as the route reveals the target. Authoritative pathfinding, collision, movement/turn rules, enemy detection and AI stay unchanged. Hover/selection alone grant no discovery.

Existing proposal, design, relevant delta specs, task descriptions and docs are reconciled with this authorized rule. Tasks 3.4 and 3.5 remain unchecked for fresh verification; old blocked-destination or clipped-route checks cannot satisfy them. This planning-only update edits no runtime or test source and launches no CPU/browser tests. Torch/campfire visual evidence remains preserved. `openspec validate add-grid-fog-and-lighting --strict` passes on 2026-10-25. CLI progress remains 19/24 with both navigation tasks pending; planning validation is not runtime acceptance. No new artifact file was created, and no proposed revision was rejected or left awaiting a human decision.

The later keyboard performance fixture must suppress hardware gamepad input only inside its disposable browser context and record that fixture choice, preserving player preferences and production input behavior. This method is documented in the design, performance delta and task 5.1; no harness or runtime implementation was changed during this planning-only step.

### Final campfire matching and capture rejection

The user's subsequent request makes generated wall torches and authored home torches share the campfire preset through `CAMPFIRE_LIGHT`: radius 5, RGB (0.90,0.58,0.25). Falloff is centered on the fixture, while `castFrom` shifts only the wall-mounted occlusion origin to the exposed adjacent cell. This gives the fixture its full campfire peak instead of attenuating its own anchor by one tile. The home fixture left of bookshelf 1 is GID 137, `Decoration 2`, local cell (1,0), emitter `authored-torch:1,0`; its matching fixture is at (8,0).

Relevant checks passed 18/18 and TypeScript passed before measurement (`output/torch-campfire-matching-tests.log`, `output/torch-campfire-matching-typecheck.log`). Final visual checks passed in muted Edge RT3 with no application errors: `output/torch-campfire-vertical-result.log`, `output/torch-campfire-horizontal-result.log`, and `output/home-campfire-light-visual-check-result.log`. The latter asserts both home fixtures have campfire radius/color and peak RGB at their own anchors. Screenshots are `output/torch-wall-lighting-fixed.png`, `output/torch-wall-horizontal-fixed.png`, and `output/home-campfire-light-fixed.png`. Final IAB loaded two ready canvases at RT3 with no loading/unsupported message or console errors, preserving existing S1 preferences, and was closed. Desktop Edge remains unavailable through the required CUA surface.

Tuned source hashes before measurement: grid lighting `e8a4785c432553e1e70f901577d6d1cc7aea0a39df0285102784ee8a1c656d1a`; campaign lighting adapter `25865c263384f2f2fb197fb6f1a1bf19cc9bfb371afb1ffe70c99aee87c3af54`. This owner made no runtime edits after freezing those definitions.

Two integrated measurement attempts are rejected, not promoted to the documentation matrix. The first completed all six sample assertions, including actual family/geometry, modes/frames, 20 steps and save isolation, but the expanded manifest found changed `world-cursor.ts` and `babylon-render-system.tsx`. Its raw output and original snapshot are preserved in `output/fog-lighting-profile-integrated-invalid-source-change-result.log` and `output/fog-lighting-integrated-invalid-source-change-before.json`.

The clean retry rejected its 200x200 RT0 sample because only 15 steps were recorded and the player ended at (102,101), rather than returning to (100,100). The source audit also found concurrent changes in `game.tsx`, `gamepad-input.ts` and `babylon-render-system.tsx`. Evidence is in `output/fog-lighting-integrated-invalid-route-result.log`, `output/fog-lighting-integrated-route-inspection.log`, `output/fog-lighting-integrated-invalid-route-source-before.json`, and `output/fog-lighting-integrated-invalid-route-source-changes.json`. No owned input defect is inferred from a capture with concurrent runtime changes.

Measurement END and window release were announced immediately after rejection. Every owner-created Edge CLI and IAB browser is closed. Shared runtime ownership and the CPU/browser window are released to the coordinator. Tasks 5.1, 5.3 and 6.3 remain open; the coordinator must settle active writers before another definitive source-frozen matrix and integrated gates. Historical matrices remain unchanged. The requested torch/home correction is implemented and visually verified, independently of the rejected performance attempts.

### Integrated revalidation queued

The user subsequently reported dark wall-mounted torch sprites and insufficient light on their own and neighboring wall cells, with two screenshots. After the diagnostic declared measurement END, the requested correction was applied only to `grid-lighting-system.ts`. Torch radius is five and RGB is (1.00, 0.65, 0.28). Wall-anchored artwork receives the strongest incident surface light; neighboring wall tiles receive weaker light. Exposed-face selection fixes oblique views and diagonal hits on vertical walls while retaining opposite-face and behind-wall occlusion. Focused lighting/presentation tests passed 15/15, including all four mounting directions, neighbor attenuation, source removal/cache reuse, and stronger reach (`output/torch-wall-lighting-tests.log`). Browser verification is queued behind the coordinator's exclusive renderer window. No browser was launched by this owner. The final six-mode capture must include this torch correction before acceptance; earlier performance captures remain historical.

After source release, the coordinated performance and graph-generation work changed the shared runtime. Tasks 5.1 and 5.3 are reopened; task 6.3 remains open. The previous six-sample JSON is preserved byte-for-byte in `rogues-dungeon/documentation/fog-and-lighting-performance-pre-integration.json`. The existing matrix and 372/372 test run describe that earlier source, not acceptance of the integrated runtime.

The executed harnesses are `output/fog-lighting-integrated-seed.js` and `output/fog-lighting-profile-integrated.js`. They explicitly select `dungeon-graph-1`, seed 17, native zoom, the same twenty-step route, five-second warmup and ten-second samples. The collector observes the actual live `PerformanceSession.regenerate` return before warmup, records topology/profile/seed/size and a SHA256 geometry/source-placement hash, and checks equal starts per size, actual RT/frames, source counts, enabled/disabled work and normal-save isolation. The observer adds no work to the measured movement/render loop. Existing raw fingerprints/source counts are not assumed for the new topology.

The prepared `output/fog-lighting-integrated-evidence.cjs` manifest recursively covers all `.ts`, `.tsx` and `.css` files under `rogues-dungeon/src`, plus package/lock/Vite configuration and the authored home map. This includes campaign-copy, sprite-patch, GameSession and Perf factory modules, A*, HUD/attribute components, graph helpers and the torch correction. Its `before` operation records the stable source; `finish` rejects the capture if any covered file changes. Both operations ran for the attempts above; `finish` rejected the changed source without replacing the historical artifact. During the earlier empty-wall-row culling preparation step, this owner performed no tests, browser launches or runtime edits.

During the original diagnostic/generation capture, this owner performed only harness, documentation and tracking preparation. After its explicit measurement END and the user's new torch-fix request, the localized lighting correction and focused tests described above were applied. TypeScript also passed (`output/torch-wall-lighting-typecheck.log`), and scoped whitespace checks passed. That was the preparation state before the coordinator released the measurement window. The later campfire tuning and browser checks passed as recorded above; two captures were then rejected for concurrent writes. The owned lighting definitions remain unchanged, all created browsers are closed, and the window is released pending a coordinated source freeze.

Fresh final checks passed on 2026-10-25: `npm test` 372/372, zero failures, in 129.221 seconds; `npm run typecheck` exit 0; `git diff --check` exit 0 with informational CRLF notices. Exact logs are `output/fog-lighting-final-node-tests.log` and `output/fog-lighting-final-typecheck.log`. The logged npm command does not include the coordinator's dungeon topology, quality or graph-layout test files. The observed 372/372 result stands; no attribution is made for the increase over the earlier 368-test run.

Both final guards and the six final-source samples are complete. All owner-created capture browsers are closed. Shared runtime source ownership is released to the coordinator and its diagnostic/generation owners. No further runtime edits or browser launches are planned by the fog owner until integrated results or a scoped failure are routed back. Task 6.3 remains open by the coordinator's explicit gate-order decision. This is a coordinated handoff, not an all-done claim.
