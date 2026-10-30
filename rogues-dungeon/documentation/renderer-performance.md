# Renderer performance checkpoint

## Fog and lighting comparison

The final integrated comparison was captured on 2026-10-29 after save/HUD, graph-generation, closed-door sight, Hero Warrior appearances and pickup-placement integration. [Raw samples and the complete runtime manifest](fog-and-lighting-performance.json) contain all six accepted samples. The earlier [pre-integration capture](fog-and-lighting-performance-pre-integration.json) and its CPU paint experiment remain historical; source-changing diagnostic attempts were rejected.

Normal play defaults to RT 3. The developer button cycles RT 0 neither, 1 fog, 2 lighting and 3 both, independently of P and S. Exploration tracking continues in every mode. RT changes do not save, advance time or change detection; reload returns to 3.

Each sample regenerated the same temporary seed-17 `dungeon-graph-1` campaign, restored initial discovery, warmed up for five seconds, then executed twenty explicit cardinal steps over ten seconds. Each returned to its starting position with discovery increasing from 69 to 109 cells. The actual geometry hashes match within each size. The 100×100 graph has ten rooms, ten edges and six light sources; the 200×200 graph has 37 rooms, 37 edges and eighteen sources. Both use floor seed 2225201261. Geometry includes cells, entities, decorations, object sets, authored layers, prefab placement, start-room data and topology.

The browser was headless Microsoft Edge 156 on Windows, 1280×720 at DPR 1, reporting 32 logical processors; GPU identity was unavailable. Actual preferences and controls confirmed native zoom, grid-tween movement, centered camera and S0. Simulation remained live, enemy logic was disabled and the semantic minimap stayed live. The disposable context suppressed gamepads for a scripted-keyboard fixture; no connected gamepad was observed before or during isolation. Normal player preferences and all three saved-slot byte strings remained unchanged by Perf.

| Grid | RT | FPS | Median ms | p95 ms | Game preparation ms/frame | Minimap preparation ms/frame | Field uploads / bytes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100×100 | 0 | 119.4 | 8.3 | 8.5 | 0.5888 | 0.0260 | 0 / 0 |
| 100×100 | 1 | 119.9 | 8.3 | 8.5 | 0.5929 | 0.0327 | 6 / 240000 |
| 100×100 | 2 | 119.1 | 8.3 | 8.5 | 0.6307 | 0.0212 | 20 / 800000 |
| 100×100 | 3 | 119.9 | 8.3 | 8.5 | 0.6018 | 0.0330 | 20 / 800000 |
| 200×200 | 0 | 119.8 | 8.3 | 8.5 | 0.7758 | 0.0268 | 0 / 0 |
| 200×200 | 3 | 119.9 | 8.3 | 8.5 | 0.8438 | 0.0421 | 20 / 3200000 |

CPU preparation per frame is the recorded mean per call multiplied by its call count and divided by captured frames. Combined mode adds 0.0130 ms/frame of game preparation at 100×100 and 0.0680 at 200×200 relative to RT 0. Minimap differences are +0.0070 and +0.0153 ms/frame. Sequential timing varies, so the small FPS differences do not establish that an enabled effect makes rendering faster. All samples have 8.3 ms median and 8.5 ms p95 cadence; RT 3 averages 119.9 FPS in both sizes, near the 120 FPS target. GPU time, other devices and enemy-heavy scenes are not measured by this visual-effects comparison.

Both RT 3 samples visit forty player-light sources and 1940 receivers over the twenty commits, while cached static-light rebuilds and static terrain compilations remain zero after warmup. Lighting preparation averages 0.045 ms per committed update at 100×100 and 0.060 ms at 200×200. Six changed exploration updates add forty known cells, averaging 0.017 and 0.067 ms respectively. RT 0 performs zero fog/light preparations or field uploads, RT 1 performs zero illumination traversal, and RT 2 performs zero fog preparation. Sparse omitted counters in the raw artifact mean zero increments. Shared dirty RGBA uploads occur only on revisions; static geometry stays retained.

The capture hashes 740 runtime, public-asset and configuration files before and after measurement, with unchanged digest `b5b6f5cb14d295a88118e97eb3dcf9df881113c8bbe03a43add5a9c603e4ab19`. The configured 160-case Chrome/Edge gate passed before profiling on an unchanged 799-file runtime/asset/test manifest. A final ordinary launch confirmed RT 3, two canvases, no persisted RT key and zero application errors. The preview monitor stayed paused throughout capture and was handed back for restoration afterward.

Representative final 100×100 views are [RT 0](fog-and-lighting-rt-zero.png), [RT 1](fog-and-lighting-rt-one.png), [RT 2](fog-and-lighting-rt-two.png) and [RT 3](fog-and-lighting-rt-three.png). Nearest-sampled grid tint, forward brightness and unknown-cell masking agree with the documented starting values. Tactical dimming remains the final gameplay overlay and is covered separately by exact unknown-pixel checks.


## Minimap marker verification follow-up, 2026-10-24

A stricter archive-verification check found that minimap marker frame updates adopted the 1x1 palette frame size instead of retaining the intended 32x32 world size. At minimap scale those markers disappeared, so the prior broad suite had missed a visible puzzle-state defect. The renderer now explicitly retains marker size on each frame update. This restores the intended colored dots and changes no normal gameplay rule or game-view art.

The repository-source regression checks actual game-door and minimap pixels in the closed, open, reloaded, and released states of a generated seed-17 puzzle. It also proves compact-save retention and another accepted push after reload. Both that case and the existing barrel case passed in Chrome and Edge, four checks total. Fresh Node tests passed 340/340, TypeScript and strict active validation passed, and fresh CLI Edge, desktop Edge, and IAB checks had ready canvases and no application console errors. Strict archived validation now passes 38/38 archives after the historical verification checklists were reconciled. Detailed evidence is in `openspec/changes/archive/2026-10-17-add-floor-trigger-door-barrel-set/verification.md` and `output/archive-reconciliation/`.

The fresh Node source digest before and after the marker fix verification was `41E3639AD71E78876DE55D7BF6E85D04228D431A6A3B1C30331C3686244B44FC`. The refreshed full browser matrix then passed 122/122 checks, 61 Chrome and 61 Edge, in 16.6 minutes with no failures or skips. Its unchanged before/after source digest was `20D74AA43F2C4DC5F00E4840BA01DFB66284E80966117F322E6F30D9D73A5E7E`. See `output/optimize-world-renderer/minimap-marker-final-clean-browser-result.json` and adjacent logs/manifests. Production code matches the passing Node snapshot; the intervening changes were two browser-test repairs and this documentation. This note was updated after the fixed-source gate. No spec sync, current-change archive, commit, or push was performed.

The first refreshed run passed 121/122 and exposed the combined four-context presentation test's 30-second aggregate budget. That test now has a bounded 60-second total, preserving individual readiness deadlines and every assertion. A subsequent run exposed a movement-test sampling race between separate position and animation reads. Those values are now captured together, while exact arrival, running before arrival, and no release drift remain required. Both focused repairs passed Chrome and Edge before the clean full run. The failures and traces remain under separate output labels; `presentation-budget-repair.md` records attribution. No production behavior changed for these repairs.

The owned preview was restored on port 6080 after the suite exited, verified HTTP 200, and its existing health monitor resumed. P: 0/1, the full-height first-column panel, all C states, fullscreen, compact bounds, and normal-save isolation retain their focused and three-context verification below. No human frame-rate acceptance is claimed.

## Earlier integration result, 2026-10-24

All 28 implementation tasks are complete. The fresh final gate passed 340/340 Node tests, TypeScript, strict OpenSpec validation, and all 120 browser checks (60 Chrome, 60 Microsoft Edge; no failures or skips). The browser suite completed in 16.7 minutes. Both gates used the same source fingerprint, `232371660155D875CDB907D1E99BF22F68F1EF3B9144C8511B301E0E5C09DA55`, with matching before/after manifests. These results supersede the historical failure counts below. This documentation update was written after those fixed-source runs.

The browser repairs use current deterministic campaign fixtures, the current Create Game flow, actual renderer/iris readiness, precise selectors, and committed-state assertions. Manual-scenario geometry is verified before export and after reload instead of expecting full terrain in compact saved JSON. Sustained travel still requires running before arrival, an exact destination, and no release drift; idle is valid after arrival. Campfire gold/time assertions wait for the completed replenishment. The fixture helper has two independent Node regressions. Detailed attribution is in `output/optimize-world-renderer/browser-repair-notes.md`.

Two small input defects were fixed during integration: keyboard feedback is captured before an action replaces campaign-dependent listeners, and keyboard X has one authoritative action owner. The Controls title now uses the current pointer-events selector and keeps its centering transform while pressed, so mouse-down cannot move it away before mouse-up. The native browser regression verifies held/released feedback, exactly one wait turn, and title-click collapse. ControlsArea.tsx and the existing tray layout remain unchanged.

Fresh muted Playwright CLI Edge, desktop Edge and IAB checks all loaded a ready game with two canvases and no application console errors. The CLI check also verified P entry/exit, every C layout state, fullscreen, and the tray title. Earlier development tabs retained temporary HMR rename errors; new clean tabs verified the final source without those errors. No human visual or frame-rate acceptance is claimed.

The owned port-6080 preview was stopped under its token-owned startup lock, and only its verified launcher tree was terminated. The suite then owned port 6081. After the test server exited, the preview was restored on port 6080, verified HTTP 200, and its existing health monitor resumed. Evidence is in `output/optimize-world-renderer/browser-repair-final-{node,browser}-result.json`, matching source manifests, and the corresponding Node, typecheck, OpenSpec and browser logs. No archive, commit or push was performed.

The measured enemy-turn CPU improvement and prototype decisions are documented below. Locked 120 FPS remains a target, not a demonstrated guarantee; the synthetic timings do not substitute for the player's campaign comparison. P: 0 retains normal rendering defaults, while P: 1 exposes the temporary full-column experiments and repeatable small-enemy scenario.

## Approved continuation and visibility corrections

On 2026-10-23 the user approved static-world sharing and explicitly instructed continued implementation through every remaining task instead of another mandatory playtest stop. The initial URL/checklist was delivered. This authorization is not a claim of human-observed visual acceptance. Normal visual defaults and turn rules remain unchanged.

During the follow-up playtest the user reported invisible items and enemies disappearing under hover. The live renderer was still passing a radius-limited discovery predicate to semantic object projection. Game and minimap now request all normal world objects; camera culling and existing enemy perception remain independent. No new fog is enabled. The unarmed targeting reticle also had an opaque black fill that covered the enemy. It now has a transparent fill and a visible outline. A normal-mode Edge screenshot with Perf closed confirms distant test items and a hovered Rat remain visible; tooltip/reticle checks and focused regressions cover both paths.

The user then explicitly restricted diagnostic rendering changes to Perf mode. The shared options accessor now returns normal defaults whenever enabled is false, and disabling Perf discards all override values. Partial updates while disabled cannot activate hidden-object, static-animation, local-distance, frozen-minimap or frozen-simulation behavior. Re-entering begins with normal rendering settings. Focused unit coverage injects stale disabled options and verifies the guard; the Edge check cycles every override then exits and re-enters.

## Scope and status

Historical early playtest scope, 2026-10-23: groups 5 and 6 delivered reversible controls and first frame-path fixes. The user subsequently authorized continuing through the experiments and finalization. The final result above is the current status; the sections below retain the measurement history and bounded prototype decisions.

Target 120 FPS, about 8.33 ms per frame. This is not a guarantee or completion threshold.

## How to compare

Open a game and click **Perf** near the upper right. The label says "Temporary performance session". It captures an independent in-memory copy of the current campaign. Experiment movement, regeneration and deaths do not autosave. **Exit Perf** restores that reference, including its unsaved progress. Confirmed **Save & Exit** in this mode also discards the experiment and restores the reference instead of saving it. Reload returns to normal storage/menu. Options are not persisted.

- **World Size** cycles 100×100, 50×50, 200×200. These are 100%, 50%, and 200% per axis, or 10,000, 2,500, and 40,000 cells. It regenerates the reference seed/settings and character baseline at the entrance. Population budgets scale by usable walkable area, not by the bounding rectangle alone. Placement restrictions can limit actual counts. Authored interiors cannot regenerate.
- **Restart route** regenerates the selected size from that same reference.
- **Draw** selects normal camera culling or its intersection with an exact centered 20×20 cell rectangle. Partial chunks hide individual outside sprites. It can have little effect if the camera already covers fewer than 20 cells.
- **Animation** selects Full/Static. Static freezes character sprite frames, hops, pickup oscillation and cosmetic clocks, and suppresses cosmetic particles. Player travel/camera remain active.
- **Dynamic** hides non-terrain world visuals. Hidden enemies still simulate and collide unless Simulation is Frozen.
- **Minimap** cycles live/frozen/off. Frozen holds its last image; Off removes its renderer and hides its canvas. Live reconciles current state on return.
- **Simulation** selects live/frozen only inside the temporary session. Frozen keeps collision-aware movement but rejects interactions. It skips ticks, enemies, projectiles, encounter progression and periodic hazard mutations. Resume does not catch up skipped ticks.
- **Reset sample** clears intervals, CPU scopes and counters without restarting the world. Metrics publish once a second.
- Existing **Mute All**, volume controls and `?mute=1` isolate audio. No audio-system behavior changed.

For the human comparison, choose one route that feels slow, warm up five seconds, reset the sample, and walk it for ten seconds. Change one setting, restart, then repeat. Compare Simulation Live/Frozen with the same visual settings. Try the combined 20×20/Static/Dynamic Off/Minimap Off mode first with Live, then Frozen. Report FPS and p95 plus which visual compromises you would accept.

## Implementation changes

Static terrain/wall arrays survive ordinary action copies. The renderer retains compiled geometry and semantic lists instead of rebuilding the full model on every animation frame. A revision-driven spatial index selects nearby dynamic entries. Repaired grid/layer identities invalidate static setup. Discovery reads share a bounded decoded-mask cache; discovery writes use independent buffers.

Each active view prepares once per animation frame. React/camera/resize notifications update inputs for that loop instead of drawing a second time. Dormant character/pivot sprite patches stop. Camera-only travel no longer refreshes React projection state without a mounted overlay that needs it.

The minimap uses a generated cell-sized color background and tiny generated-color mover quads, not PNGs or gameplay atlases. Shared interpolated player/enemy/barrel coordinates update independently. Static background uploads happen on semantic/discovery changes, not marker-only travel. Hidden/off maps skip preparation/submission.

Empty deep void cells allocate no terrain sprites. The scene clears to black once, then draws terrain and bordering walls. A direct seed-17 floor inspection found 692 ground and 771 wall entries in a 100×100 grid; 8,537 deep-void cells have no visual. The URL scenario derives its own floor seed and is not that direct-generator inspection. Static dungeon geometry does not use discovery as a new fog effect. No lighting or fog was added.

The focused check also exposed two lifecycle faults during rapid regeneration. Cancelled asynchronous asset loads could resume against disposed animation state. Shared grid textures could be destroyed through atlas disposal while another view still owned them. Setup now checks cancellation after frame loading, centralizes cleanup, and only disposes independently packed atlases through the atlas destructor.

## Measurement meaning

FPS, median and p95 are game-view requestAnimationFrame intervals, not GPU timestamps or guaranteed presented frames. The warm samples show an approximately 120 Hz scheduling cadence. A 60 Hz machine cannot demonstrate 120 presented FPS.

CPU scopes are wall-clock main-thread timings. "action (inclusive)" covers the domain action calculation, including nested clone/upgrade and tick. Tick includes AI. Commit/save callbacks are a separate scope. Save includes nested serialization/storage scopes. Do not add nested means together. "React commit" records React Profiler actual render duration, not paint or all commit effects. Preparation timers exclude GPU submission/execution.

Counters are totals since reset. Divide active-layer and active-layer-sprite-slot totals by game preparations for average residency. Sprite slots include hidden sprites inside a partially clipped active chunk, so they are not a GPU-visible-fragment count. "sprite patches" counts actual renderer update calls. "static cells checked" counts chunk visibility checks, not the whole grid. Missing tick/AI/upload counts mean zero work. Fresh generation/renderer initialization happens before warmup and is excluded from route samples.

Frozen preserves the live within-cell shallow-copy fast path and uses the same instrumented full clone/upgrade path at center/cell crossings. It still runs collision checks, input integration, campaign publication, React rendering, semantic queries, animation and camera work. Removing ticks therefore does not remove other CPU movement costs. No asynchronous simulation or Promise wrapper was introduced.

## One-seed Edge result

Source HEAD `539007d`, dirty shared checkout with this change and unrelated in-progress work. Vite development/React development build, Babylon Lite 1.32.0. Headless Microsoft Edge 156 on Windows, NVIDIA Lovelace adapter, 32 reported logical processors. Exact GPU device and CPU model were not exposed by the browser. Viewport 1280×720, DPR 1, native 1× zoom, Center camera, Gridless movement, muted.

World identity seed 17, world/run/slot/level 1, derives floor seed 2225201261. Same character and generator profile in all samples. Regenerated object counts were 14 at 100×100, 8 at 50×50, and 74 at 200×200. Counts include all floor entities, not just enemies.

Each sample warms five seconds, resets counters, then alternates A/D for 500 ms each, ten pairs, near the entrance. The nominal route moves two cells west and two east repeatedly on the entrance row: x=50/49/48/49/50 at normal size, x=25/24/23/24/25 at 50, x=100/99/98/99/100 at 200. Keyboard scheduling and stalls cause endpoint drift; measured absolute travel was 1,194–1,303 pixels. These are short diagnostic samples, not statistical estimates or exact cell-locked replays.

| Variant | Dimensions | FPS | Median ms | p95 ms | Mean clone ms | Ticks |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| reference | 100×100 | 110 | 8.3 | 16.6 | 4.30 | 44 |
| local | 100×100 | 101 | 8.3 | 16.8 | 5.07 | 39 |
| static | 100×100 | 110 | 8.3 | 16.6 | 3.55 | 39 |
| dynamic-off | 100×100 | 107 | 8.3 | 16.7 | 3.94 | 40 |
| minimap-frozen | 100×100 | 79 | 8.4 | 25.1 | 5.58 | 39 |
| minimap-off | 100×100 | 90 | 8.4 | 25.0 | 4.93 | 37 |
| simulation-frozen | 100×100 | 97 | 8.4 | 16.8 | 4.67 | 0 |
| 50 | 50×50 | 110 | 8.3 | 16.6 | 1.20 | 40 |
| 200 | 200×200 | 41 | 8.5 | 83.4 | 27.29 | 38 |
| minimal | 100×100 | 108 | 8.3 | 16.7 | 3.93 | 0 |

The combined minimal sample uses 20×20, Static, Dynamic Off, Minimap Off and Simulation Frozen. Other variants change only the named setting from reference. The "reference" is a post-fix control sample, not a measured pre-change baseline. An earlier approximately 40 FPS observation lacked a matching protocol and must not be used to claim a measured speedup. CPU/host load changed between sequential samples; negative differences, especially minimap Frozen/Off, do not prove those modes cause extra work.

Reference work totals: 1,149 game preparations, 1,149 minimap preparations over 1,148 measured intervals, with one extra endpoint preparation; 168 model builds across both views; zero static compilations after warmup; two minimap background uploads, not one per frame/action. Average preparation was 0.335 ms game and 0.028 ms minimap. Mean tick was 0.039 ms, including 0.030 ms AI. Mean clone was 4.30 ms over 124 calls; worst domain action was 12 ms. React rendered 2,269 measured commits averaging 0.817 ms.

Frozen moved 1,271 pixels with zero ticks, enemy visits or AI calls, and no static minimap uploads. Mean clone remained 4.67 ms. It did not produce a large frame-time gain. This sample does not support moving enemy simulation to a worker as the first optimization.

At 200×200, mean clone reached 27.29 ms, max clone 52.10 ms, and worst domain action 99.50 ms. Mean AI stayed 0.074 ms. This is strong scaling evidence against copying the entire campaign/terrain on movement crossings. World size is relevant to CPU state-copy work, not proof that all of that world is being drawn.

Static animation reduced sprite patches from 9,138 to 5,610 without a large FPS gain. Dynamic Off reduced them to 3,308. The minimap's preparation/upload work was already small after retention; Frozen/Off recorded zero preparation/uploads. No isolated visual switch reached the large-win threshold on this short route. The next priority for discussion is removing immutable geometry/history from action cloning and reducing high-frequency React campaign publication, before speculative AI threading. Renderer submissions and visible-layer counts still need a GPU-side investigation after player feedback. Pickups already stop updates outside the draw region.

Raw CPU means/maxima, counts and context are in [renderer-performance-sample.json](renderer-performance-sample.json). The repeatable CLI scenario is `test/browser/renderer-performance-check.js`. The first attempts were discarded after the lifecycle defects and a reload assertion fault; only the clean completed pass above is retained.

## Verification and checkpoint

Typecheck passed. Twenty-one focused tests passed for dimension determinism/bounds/connectivity at seed 17, reference-session isolation, frozen/resumed state, clone retention, geometry/discovery caching, frame summaries, minimap coordinates/revisions, renderer bounds, particles, dormant sprite patches and visibility.

The clean muted Edge comparison completed all controls/sizes, movement in every sample, and storage/exit/reload checks. It reported no application errors or GPU validation warnings. The browser's known Windows powerPreference warning remains. Existing slot bytes were unchanged in the comparison profile. A separate occupied-slot check passed movement/regeneration/Save & Exit/Exit Perf/reload with 8,874 saved bytes unchanged and the original player position restored. It removed only its own fixture slot and backup from the isolated automation profile.

A brief five-second idle overhead check measured 117.60 FPS and 8.5 ms p95 both with diagnostics closed and open. This found no large diagnostic overhead at idle, not proof of zero movement overhead. Game canvas backing/CSS size was 717×662 and minimap 257×129 at DPR 1. A third hidden canvas was 300×150 with zero CSS area. Visual inspection confirmed dungeon/player rendering, black empty void, semantic minimap, and usable controls. The expanded controls now sit at the lower left so the minimap remains visible.

The user subsequently authorized finishing all remaining tasks without another mandatory playtest stop. This does not establish human acceptance. Normal visual defaults remain unchanged, and every diagnostic override is ignored and cleared when Perf is off.

## Static-world sharing comparison

Action copies now share immutable terrain, numeric adapters and authored layers across active, visited and recovery floors. Mutable state remains independently cloned with its aliases intact. Trusted sessions normalize static grids once at the import/replacement boundary instead of rebuilding them during movement and path queries. Legacy standalone callers still normalize their inputs.

The same seed/route and browser context were repeated after this change. The displayed metrics refresh once a second, so the captured intervals cover approximately 9.8 seconds of the nominal ten-second route. Concurrent work changed the normal-size population from 14 to 15 entities. These sequential development-build measurements are not an isolated hardware benchmark.

| Size | Mean clone before/after ms | Worst action before/after ms | FPS before/after | p95 before/after ms |
| --- | ---: | ---: | ---: | ---: |
| 100×100 | 4.30 / 0.245 | 12 / 3.1 | 110 / 87.6 | 16.6 / 25 |
| 200×200 | 27.29 / 0.397 | 99.5 / 3.9 | 40.6 / 84.3 | 83.4 / 25 |

Clone means fell approximately 94% and 98.5%. The 200-size sample doubled throughput and reduced p95 about 70%; the normal-size frame sample worsened despite cheaper copying. Host load and React development work remain confounders, so do not infer a normal-size frame regression caused by sharing from this one comparison. Static normalization ran once per route rather than once per tick. Tick/AI means stayed below 0.1 ms. Game preparation means were 0.484/0.591 ms and minimap means 0.040/0.045 ms. Each minimap uploaded its background once. Raw results are in `static-sharing-performance-sample.json`.

The occupied-slot isolation check passed again after static sharing: movement occurred, the reference position returned, and all slot/backup bytes stayed unchanged through size cycling, Save & Exit, Exit Perf and reload. Its fixture was 8,844 bytes and was removed from the isolated test profile afterward. Deterministic full-copy-control tests and mutable-graph isolation tests cover action/event compatibility.

## Final all-zoom running profile

All currently supported presets were checked, including the three developer-only presets. The initial accidental 50×50 run was discarded; the retained run asserts 100×100 at every restart. It uses seed identity 17, floor seed 2225201261, 15 entities, the same native comparison's Edge/device/viewport context, Center/Gridless, live simulation and full normal visuals. Each sample warmed five seconds and alternated the same A/D route for ten seconds, with 1,261–1,277 pixels of travel. No application console errors occurred. Raw metrics are in `zoom-performance-sample.json`.

| Zoom | FPS | Median ms | p95 ms |
| --- | ---: | ---: | ---: |
| 0.25× developer | 92.6 | 8.4 | 24.9 |
| 0.5× developer | 103.8 | 8.3 | 16.7 |
| 1× normal | 109.2 | 8.3 | 16.7 |
| 2× normal | 82.3 | 8.4 | 25.0 |
| 4× developer | 102.7 | 8.3 | 16.7 |

The approximately 120 Hz cadence permits the 120 FPS target, but no route held it: p95 exceeds the 8.33 ms budget at every zoom. Do not interpret the sequential 2× dip as a causal zoom cost, since 4× recovers and host load was uncontrolled. Game preparation means range 0.424–0.653 ms; clone means 0.181–0.216 ms; React rendering averages 0.948–1.402 ms per measured render with two renders around many movement updates and occasional 22.6 ms samples. High-frequency React publication/development overhead remains a larger CPU suspect than AI, audio or minimap buffers. Submission/GPU time has not been measured directly. Keep full visuals and normal draw distance; no automatic visual downgrade, worker or speculative shader is retained.

### Static batching experiment

A temporary, explicitly Perf-gated branch changed static chunks from 16 to 32 cells. The normal session remained at 16 even with the diagnostic query set. This batches compatible terrain and wall-row submissions while keeping the same per-row wall depth algorithm and adjacent character shadow/main ordering. Native-zoom screenshots showed matching crisp tile edges, black void and no visible seams or foreground flattening around the player and props. This was a single scene check, not an exhaustive visual proof.

The paired seed-17 route measured 78.4 versus 90.8 FPS, median 8.4 ms for both, and p95 25.1 versus 25.0 ms. Mean active layers fell from 59.7 to 44.9, but active sprite slots stayed about 1,436 per preparation. Game preparation fell from 0.621 to 0.435 ms. Clone means were 0.227/0.209 ms, React render means 1.454/1.234 ms, and no console errors occurred. Complete CPU means/maxima and counters are in `chunk-batching-performance-sample.json`.

Discard this production branch: the approximately 16% throughput difference did not meet the large-win criterion and p95 barely changed, with sequential host load a confounder. Larger chunks also weaken culling elsewhere. The branch and its activation query were removed. No shader is retained: fragment atlas lookup would not remove the remaining React publication cost, and this submission experiment did not establish a large GPU bottleneck. Normal chunk size and draw-distance defaults remain unchanged.

A test-only module worker builds revision-tagged semantic RGBA buffers from transferable terrain/wall/object coordinates. The focused test rejects stale revisions and retains the last accepted image. On the same seeded 100/200 layouts, output matched main-thread bytes exactly. Main-thread preparation took 0.6/0.7 ms; worker computation took 0.4/0.2 ms, but end-to-end latency was 66.4 ms for cold startup and 1.1 ms when warm, transferring 40,000/160,000 output bytes plus inputs. These are CPU wall times, not GPU timestamps.

Discard the production worker path. Retained minimap preparation already costs around 0.04 ms per frame with rare background uploads; scheduling and transfers did not demonstrate a large win. Only the reproducible test prototype remains, with explicit worker termination. No worker runs in normal gameplay or Perf.

OffscreenCanvas exists in this browser and the installed engine accepts it, but full-render migration is not a transferable-buffer change. The shared WebGPU engine owns two DOM-sized views, asset loading, ResizeObserver/input integration and React projection overlays. Moving that ownership requires a separate engine integration design. Worker WebGPU support was not independently tested.

Simulation offload is also not justified by this route. Frozen suppressed ticks and enemy visits without a large frame gain, while measured AI remained below 0.1 ms after cloning. Keep the synchronous authoritative writer, ordered action events and save-after-commit callbacks. No asynchronous result queue or stale simulation state is introduced, so there is no transfer/input delay to hide. The deterministic action/event and save-isolation checks verify that decision rather than treating a Promise wrapper as offloading.

## Integration decisions and browser verification

Keep static-data sharing, boundary-only normalization, retained static geometry, local semantic queries, coalesced per-view preparation and retained minimap dots. Remove the losing larger-chunk branch. The worker exists only in test files, never in the production import graph. No shader, worker, automatic draw-distance reduction or normal animation suppression was added. Perf off ignores all diagnostic overrides, and Exit Perf clears them. Item discovery gating and the opaque unarmed-hover reticle were corrected after the player's report; ordinary items remain visible without walking into them and hovering does not cover an enemy with black.

Typecheck and the production build pass. A fresh focused run passed all 27 performance/character-sprite/world-render/particle tests, including reentrant queued input, ordered events and save callbacks that see only fully committed authoritative state. The renderer mounting assertion also passes after updating it for null ground frames and Canvas2D texture preparation. The game still renders through WebGPU only; Canvas2D builds generated textures, not a fallback scene. Vite reports existing unresolved-at-build-time public asset references and its bundle-size warning.

Three-context verification completed on the same owned 6080 server. Playwright CLI used Microsoft Edge. Desktop Edge and IAB each loaded an existing saved slot, showed the game and semantic minimap with two canvases, and reported zero console errors and no unsupported-WebGPU message. Desktop Edge showed the dungeon after its entrance iris opened. IAB's saved session initially had monochrome S:1 and an old off-map position; temporary regeneration at 100×100 showed the dungeon, player and pickups correctly. Exit Perf restored the reference, and its original S:1 preference was restored. Only the agent-created tabs were closed.

The isolated automated ownership scenario used a full seed-17 run identity and an approach to its actual generated stairs. Temporary play survived fullscreen entry/exit and portrait/landscape switching, crossed to level 2, and left saved bytes unchanged. Exit Perf restored level 1; the same stair step in normal mode then saved level 2. Both canvases survived and no console errors occurred. Earlier attempts were discarded because a direct-generator fixture lacked a persistent run identity and because input was sent before the entrance iris finished. The corrected test waits for the iris. It removed only its own slot/backup fixture.

The final occupied-save isolation rerun also uses a full run identity and first asserts that generated stairs survive reload. It passed movement/regeneration/Save & Exit/Exit Perf/reload with 4,485 slot bytes unchanged, restored the reference position, and removed only its own fixture. This replaces the weaker direct-generator fixture as the final persistence evidence.

## Remaining finalization blockers

This section records the earlier checkpoint. The completed full browser run and fresh Node result below supersede its counts and the old startup-lock blocker.

Task 8.1 remains unchecked. The final `npm test` run has 328 tests, 293 passes and 35 failures. Evidence is in `output/optimization-node-tests-final.log`; the preceding run had 36 failures, and its renderer-source assertion was corrected and passed independently. The remaining failures include schema-5 expectations against schema 6, legacy/death recovery rules, world-growth balance and enemy detection, Tiled repair fixtures, and source-text assertions against UI changes in this shared checkout. Earlier full-copy controls reproduced eight representative gameplay failures without static sharing. These results do not prove every remaining failure predates every other change. Reconcile the other gameplay contracts and their tests separately rather than changing normal rules to force an optimization sign-off.

Task 8.4 remains unchecked and the full browser suite has not been run. Its 120 tests were discovered successfully, but the required server shutdown could not acquire `output/run-state/startup.lock`. The directory is empty, has no owner.json and dates to 2026-10-22 19:23. After the required bounded 30-second acquisition attempt, the stop workflow preserved the lock and verified Vite PID 45164 on port 6080. No second server was started, no process was killed and no stale lock was stolen. User approval to remove the orphaned lock was requested before retrying shutdown, the suite, and restoration of 6080.

## Enemy-only rendering and movement isolation

The user requested hiding enemies first, then stopping their movement to distinguish drawing from time-related enemy work. The initial `test/browser/enemy-isolation-check.js` ran four disposable Microsoft Edge contexts. It intercepted only those contexts' module responses; it did not modify app source, the human's current page or any normal setting. Every injected override required Perf to be active. Closing each context removed its response overrides. That initial diagnostic did not add an application enemy switch. The follow-up below adds the requested Perf-only control and uses it for the default live/paused comparison.

All cases use the same seed-17 identity, floor seed 2225201261, 100×100 geometry, native zoom and 1280×720/DPR-1 development view. A synthetic in-memory fixture places four generated enemy copies on nearby walkable cells and gives them awareness 20 and cooldown 3 so actual pursuit occurs. Player health/perception are raised only in that disposable Perf fixture. This is an active-enemy diagnostic, not a natural-generation population or a measurement of the human's exact save. Each case warms three seconds, then alternates A/D every 500 ms for ten seconds. Battle movement restrictions apply normally. Autosaving is disabled equally in every case.

| Mode | FPS | Median/p95 ms | Mean AI per tick ms | Worst action ms |
| --- | ---: | ---: | ---: | ---: |
| Normal enemies | 99.2 | 10.0 / 10.2 | 6.41 | 17.6 |
| Hidden, AI still live | 97.8 | 10.0 / 10.2 | 7.08 | 21.9 |
| Visible, enemy turns paused | 100.7 | 10.0 / 10.2 | below timer resolution | 0.6 |
| Visible, instant position changes | 99.0 | 10.0 / 10.3 | 6.08 | 21.5 |

Normal, hidden and instant-position cases had identical final enemy positions and 576 pixels of player travel. Their world time advanced 18 turns; published metrics captured 17 because the panel refreshes once per second. Hidden recorded zero rendered enemy actors at both endpoints while enemies continued moving, with 68 enemy visits and 34 navigation calls in the published sample. Normal and instant-position cases rendered three to four enemies. The instant-position override skips enemy translation/staggered-motion playback but keeps logical movement and character sprite animation.

Paused skips the enemy phase, including planning and attacks, rather than just cancelling visual interpolation. Its enemies remained at exactly the same positions and remained visible. World time still advanced 20 turns, the player travelled 640 pixels, and navigation calls were absent. Different collision outcomes permit the extra movement, so its FPS is not a strict equal-work speedup comparison. All contexts reported zero application errors.

Hiding actors reduced sprite patches from 19,368 to 11,959 but produced no large FPS gain. Removing timed movement playback also produced no large gain. Suppressing enemy turns removed the measured 6–7 ms mean AI cost and 18–22 ms action peaks, but did not produce a dramatic average-FPS gain in this short approximately 100 Hz scheduled run. These results implicate logical AI/pathfinding in per-turn CPU stalls, not drawing or staggered animation as their primary cause. They do not establish that enemy AI alone explains the reported 21 FPS. The preceding normal-versus-Perf X test also implicated synchronous save preparation, which this comparison deliberately excludes.

The earlier entrance-route AI means below 0.1 ms mostly represented idle enemies and must not be generalized to pursuing enemies. Active-pathfinding evidence changes that assessment. `pathWithBlockedCells` builds a complete walkability grid for each search; `findCardinalPathCore` can build it twice for one enemy. A separate bounded CPU-only fixture with four active pursuers measured mean AI 12.5 ms at 100×100 and 53.4 ms at 200×200. Those are synthetic CPU timings, not browser FPS or representative natural enemy populations. The next CPU work should address repeated whole-grid path preparation and save regeneration; worker feasibility must be reconsidered against active workloads rather than rejected on idle-route numbers alone.

Raw browser contexts, full CPU means/maxima, work counts and before/after coordinates are in `enemy-isolation-performance-sample.json`. The harness rejects a hidden mode that draws actors or changes authoritative movement, and a paused mode that hides actors, stops the clock or still navigates. Instant-position mode must preserve the normal case's committed positions. No normal gameplay visuals or turn rules were changed by this diagnostic.

## Enemy-only pause and local path preparation fix

The requested `Enemy logic: Live/Off` button is now inside Perf. Off skips the enemy phase entirely, including planning, movement, attacks, splitting and projectile creation. It leaves enemy sprites, the minimap, player actions, world time and non-enemy rules live. Switching off settles any already-committed enemy translation immediately without interrupting player motion. Cosmetic sprite animation is unchanged. The session callback requires an active temporary campaign; ordinary sessions always run AI. The flag is not serialized, cannot leak through action copies, and resets to Live on Exit Perf or a fresh Perf session. Simulation Frozen remains a separate, broader diagnostic.

The first native-control browser check confirmed a mean AI cost of 9.75 ms with a 25.7 ms worst action. Off removed AI/navigation entirely and reduced the worst action to 0.8 ms while keeping enemies drawn at unchanged coordinates. This justified fixing path preparation first.

`a-star.ts` now constructs nodes lazily for each route query instead of allocating and testing the entire floor twice per enemy. It uses the same library A*, GridNode IDs, cardinal neighbor order, heuristic, costs and node budget. Dynamic occupancy, door and trap predicates remain query-local. No shared walkability cache can retain stale blockers, and subsequent queries see terrain edits. No renderer, draw distance, animation cadence, awareness, cooldown, route selection or turn-order change accompanies this optimization. AI still commits synchronously, but nearby pursuit no longer performs work proportional to the entire floor. A Promise wrapper or worker was unnecessary for this measured cost.

The same native-control seed/fixture/route comparison was repeated after the fix. Raw results are in `enemy-logic-performance-sample.json`.

| Live AI measurement | Before | After |
| --- | ---: | ---: |
| Mean AI per tick | 9.75 ms | 0.23 ms |
| Worst AI per tick | 25.1 ms | 1.4 ms |
| Worst complete action | 25.7 ms | 2.0 ms |
| Mean frame throughput | 112.3 FPS | 116.6 FPS |
| Median / p95 display interval | 8.3 / 8.5 ms | 8.3 / 8.5 ms |

Both live cases ended at identical enemy coordinates with 576 pixels of player travel. The after case evaluated 1,664 navigation nodes across 34 calls rather than preparing two 10,000-cell grids per call. Frame counts and the captured tick window differ because the metrics panel refreshes once a second. A separate paused follow-up verified stationary visible enemies across 20 turns and 640 pixels, then exactly one resumed turn with enemies moving again, no catch-up, and Live restored on a new Perf entry. All checks reported no application errors. The FPS change is modest and sequential host load is uncontrolled; this fixes a demonstrated turn stall but does not prove that AI alone caused the human's 21 FPS or that 120 FPS is locked.

The bounded CPU diagnostic is reproducible with `node --import tsx rogues-dungeon/test/enemy-logic-benchmark.js`. It uses one seed, one/four active pursuers and twelve fresh-state wait actions at 100 and 200 cells per side. The immediate four-enemy before/after AI means were 13.34/1.02 ms and 56.25/0.32 ms respectively. A later host-loaded repeat returned 2.09/0.49 ms after; timings are not thresholds. Normal synchronous save preparation remains a separate measured CPU suspect and is unchanged by this fix.

All 19 performance tests pass, including exact full-grid-reference route comparisons for pickups, blocked destinations, doors, changing terrain, dynamic gates and node budgets; nested gridless entries while paused; unchanged enemy state; attacks resuming; normal-session behavior; and independent player interpolation. Typecheck and production build pass. Playwright CLI Edge, desktop Edge and IAB all showed a ready game view, two canvases, the working enemy control and no application console errors. The occupied-save test retained all 5,339 bytes through Off, travel, size cycling, Save & Exit, Exit Perf and reload, with the reference position restored and enemy logic reset to Live. The React review kept the toggle event-driven, hook subscriptions unconditional and diagnostic state outside saved gameplay state.

Fresh final Node evidence is `output/enemy-optimization-node-tests.log`: 333 tests, 298 passes and the same 35 named failures as the pre-enemy-change run. There are no newly named failures. Task 8.1 therefore remains unchecked. Task 8.4 still needs the server ownership lock resolved before shutdown and the full browser suite; the lock and running server were left untouched. This enemy fix is ready for a focused human comparison, not an all-tasks-complete sign-off.

## Full integration gate on 2026-10-23

After RUN resolved the old lock and stopped the preview, the configured full browser suite ran once with one worker and its own Vite server on 4173. All 120 tests reached terminal outcomes. The command exited 1 after 31.4 minutes: 53 passed, 67 failed, none skipped or flaky. Chromium had 25 passes and 35 failures; Microsoft Edge had 28 passes and 32 failures. The log, JSON report, screenshots and traces are under `output/optimize-world-renderer/`, with `integration-report.md` containing the per-file counts, investigated causes and candidate file-attribution scope.

The six native-zoom Wang focus fixtures passed in both browsers. Aspect-range layouts, fullscreen portrait framing, portrait world sizing, centered Gridless mouse travel, trap gestures, movement retargeting, slot presentation, teleport visuals and the unarmed tip also passed in both. Edge's renderer-startup test passed with loaded textures and no recorded application console errors. Its earlier Chromium counterpart stopped at the new Create Game dialog before a renderer existed; the shared creation helper changed during the suite. This is evidence from a live changing checkout, not an immutable-revision sign-off.

Eighteen Wang cases reached zoom selection but could not select a developer-only option because the test context did not enable the existing zoom-test setting. Other investigated failures concern outdated creation steps, ambiguous UI selectors/layout assumptions, generated-object/compact-save fixtures and Battle/cursor expectations. The combined hover check expects a fight cursor from an unarmed fixture, while current cursor rules require a weapon and return blocked. That combined assertion alone does not establish missing enemy artwork. Not every failed case has been individually controlled, so none of these observations is a blanket baseline exemption.

A preview restart briefly created a second server during Edge. RUN corrected it and paused the preview's monitor; the suite continued with only its test server. The actual terminal command result, full JSON report and post-exit listener/process checks confirmed completion. No test process was killed. The test server exited, after which RUN restored port 6080. This chat verified repository-owned Vite PID 81772, HTTP 200 and the expected title. These functional checks make no new frame-performance claim.

The fresh post-browser `npm test` run has 333 tests, 307 passes and 26 failures, exit code 1. `npm run typecheck` passes, exit code 0. All 19 performance tests and deterministic AI planning/contested-cell tests pass. The current autosave-resume test fails on a missing generated chest before invoking writeSlot, so that particular failure does not demonstrate a broken save round trip. Logs are `output/optimize-world-renderer/node-tests-final.log` and `typecheck-final.log`. The earlier 35 failures and another chat's reported 21 are historical counts, not this gate's result.

Tasks 8.1 and 8.4 remain unchecked. The full-suite execution/report portion is complete, but the remaining movement/preview, fixture/persistence and layout failures still block clean integration acceptance. This is not a clean finalization candidate. No archive, commit, push or unrelated cleanup was performed. Shared files, especially game.tsx, world-procedural-system.ts, a-star.ts, save-system.ts, babylon-render-system.tsx and style.css, contain other active owners' edits and must not be staged wholesale for this change alone.

## Enemy-turn follow-up and small-world comparison

The human's same-session observation, about 120 to 118 FPS with enemy logic Off versus about 7 FPS with it Live, supersedes the earlier easy-route inference. The four nearby pursuers in that earlier fixture did not exercise costly failed pursuit. This follow-up changes enemy CPU work, not normal rendering or AI turn rules.

An adversarial CPU sample with twelve nearby enemies separated from the player by an impassable partition reproduced 130.19 ms per action at 100x100 and 820.62 ms at 200x200. Off took 0.41 ms in both samples. Those are synthetic cases, not a capture of the human's campaign. They exposed repeated failed A* searches, per-node scans of all decorations/object sets, and rebuilding identical blockers and routes for each enemy.

Normal enemy planning now uses one turn-local blocker snapshot and a lazily expanded reverse reachability search per distinct trap-avoidance policy. Impossible pursuits are rejected before A*. Pickup-avoiding and fallback searches share data where their policies match. Identical failed fallback queries and identical gold-route queries are skipped. Reachable paths retain the installed A* neighbor order, tie choices, pickup/gold policy and node budget. Resolution still rechecks live gates/occupancy, orders enemies by ID, and preserves attacks, cooldowns, trap avoidance and splitting. Nothing is cached across changed turns or written into a campaign/save.

The final isolated Edge 156 CPU check used ten wait actions after two warmups. A control retaining per-enemy searches but including the final duplicate-query skip took 56.42 ms mean and 72 ms maximum per action. Batched planning took 1.54 ms mean and 2.5 ms maximum; Off took 1.50 ms mean and 6.1 ms maximum under sequential, uncontrolled host load. AI alone averaged 55.89 ms in the control and 0.99 ms batched. The control tested 510,080 A* cells; the batched run tested no A* cells and expanded 49,000 reachability cells across ten turns. This is CPU timing, not an FPS/GPU claim. Raw results are in `enemy-turn-performance-sample.json`; reproduce with Playwright CLI Edge and `test/browser/enemy-turn-check.js`.

Inside Perf, **Enemy test: 50×50 / 8** generates a small world with eight deterministic reachable nearby skeletons. It boosts temporary Health and Perception, uses normal visuals and live simulation, and preserves the selected Enemy logic Live/Off setting. Clicking it again restores the identical initial state. Exit Perf restores the reference campaign; the test cannot be launched outside a temporary session or inside an authored prefab. It does not alter normal world population or placement.

The browser preset comparison pressed X forty times in each fresh scenario. Both runs advanced time from 1 to 41. Live enemies pursued and attacked; Off enemies stayed visible at their original coordinates and ran no AI/navigation. Live AI averaged 0.42 ms, maximum 4.3 ms, and total actions averaged 0.85 ms. Off actions averaged 0.44 ms. Overall display samples were 93.59 versus 102.44 FPS, with 8.3 ms medians and 33.3 versus 16.6 ms p95 intervals. These sequential development-server samples do not demonstrate locked 120 FPS. Both had two canvases, no application console errors and unchanged storage. Raw data is `small-enemy-performance-sample.json`; the executable check is `test/browser/small-enemy-scenario-check.js`.

Enemy actionCooldown and nextActionAt are game-turn counters, not fractions of a real second allotted for thinking. Awareness already excludes distant enemies before pathfinding; offscreen sprite work is separately culled. Normal AI does not depend on camera position or zoom. Making offscreen enemies stop authoritative turns is a gameplay choice, not a renderer optimization, and has not been silently applied.

A test-only next-cardinal-direction field was also measured on eight nearby pursuers in 50x50 terrain without pickups, traps or gates. Over 100 warmed navigation-only samples, per-enemy queries averaged 0.237 ms, exact batched queries 0.208 ms and the field 0.055 ms. Its shortest routes had different tie choices, and it does not implement the full pickup/trap policy. Keep it outside production; the small absolute saving does not justify silently replacing established behavior. `test/enemy-direction-field-prototype.ts` verifies legal shortest steps and shared expansion. `test/enemy-turn-benchmark.js` reproduces the CPU cases. An eight-region/portal hierarchy remains a candidate only if long reachable pursuit is subsequently measured as a large cost; it must preserve actual corridor/door connectivity rather than point enemies at region centers through walls.

All 23 focused performance tests pass, including 288 exact batched/full-grid-reference route comparisons, deterministic planner output, changing gates/occupancy, trap-policy grouping, one shared unreachable search, and temporary small-world Live/Off isolation. Six focused existing AI/combat/wait tests also pass. Typecheck passes after explicit nullable/queued-result narrowing in the new test. Fresh npm test has 338 tests, 314 passes and 24 failures in detection/Battle, generated-world/reward, save/migration, and source/UI contract fixtures. This shared changing checkout is not a fixed-snapshot clean gate. Tasks 8.1 and 8.4 remain unchecked; the historical full browser failures above are not a fresh final sign-off. No broad browser suite was repeated for this bounded follow-up.

Playwright CLI Edge, a separate desktop Edge tab and a hidden IAB tab all showed the new preset, a ready game view, two canvases and no application console errors. Live/Off worked without hiding enemies. The React review kept the new action event-driven and behind the temporary ownership guard, with no new effect subscription or normal-game settings persistence.

## Performance column and P control

Dev Settings now has a session-only P: 0/1 control instead of the floating Perf launcher. P: 1 opens the temporary session in the primary information column, replacing the covered Abilities, Quick Slots, Equipment and Inventory controls while retaining the same column container and attachment tab. P: 0 or Exit Perf restores the reference campaign. C moves/collapses the column without resetting the experiment. Opening P from a collapsed state reveals the primary column. No diagnostic setting is persisted.

The panel uses the incumbent Settings button palette, grouped Simulation/Rendering/Scenario controls, a fixed FPS summary and exit footer, and a bounded scrolling body for detailed counters. Collapsed controls are inert. It follows the column's existing motion rather than measuring the viewport every frame. Portrait uses the primary Mobile Information region with a viewport-bounded panel; hidden secondary/mobile minimaps are not activated just to show PC diagnostics.

The focused muted Edge check `test/browser/performance-column-check.js` passes P entry/exit, all four C states, preserved Enemy logic Off while collapsed, restored Live on a fresh P session, opening from collapsed, fullscreen, 1280x720 and 800x450 bounds, button wrapping, counter expansion and saved-slot isolation. Desktop Edge and IAB also showed the panel in the primary column, a ready renderer and no application console errors. Portrait's panel bottom was 709.38 inside a 720-pixel viewport. Screenshots are in `output/optimize-world-renderer/performance-column.png` and `performance-column-compact.png`.

The focused performance tests pass 23/23 and the keyboard-drag source contract passes after retaining its StatusControls prop binding. Typecheck passes. The latest whole Node run has 338 tests, 331 passes and seven failures in the shared detection/Battle, reward/generation, enemy-art fixture and inventory-capacity contracts. This is not a clean final integration gate or a fixed-revision sign-off. The Impeccable layout/design scan returned no findings; its review kept the existing visual style, column motion, readable states and local scrolling rather than adding an independent floating window.

