# Movement and interaction verification

Change: `add-movement-modes-and-context-cursors`.

## Finalization exception approved on 2026-10-22

The user approved completing the scoped spec sync, archive, commit, and push with the observed verification failures recorded. This approval does not turn failed or incomplete checks into passes. Unopened crates use the existing interaction cursor; the proposal and cursor contract now match that resolver.

Finalization validation passed all 34 main specs and strict validation of this change. The archived-task check passed this change with 22/22 tasks; its bulk result was 33 passing archives and two older failing archives, `2026-10-17-add-floor-trigger-door-barrel-set` with 7/10 tasks and `2026-10-17-formalize-world-render-depth` with 8/9. Those unrelated archives were left unchanged.

The pre-finalization `npm test` run completed with 267 passing and 9 failing tests out of 276. Failures covered URL options, level-one starter placement, Skeleton/Rat balance, Difficulty scaling, Skeleton Archer identity, pivot-overlay source assertions, random-seed source assertions, How To Play CSS assertions, and the level-one trap fixture. The log is `output/movement-finalize-unit.log`.

`npm run typecheck` reported TS2339 at `rogues-dungeon/test/game.test.ts:1954` and `:1959`, where `.item` was accessed on an `Entity` union without a retained narrowing. The log is `output/movement-finalize-typecheck.log`. These are observations from the earlier checkout during concurrent work, not a claim about the later finalization commit.

The sandboxed Edge attempt failed during browser-profile creation. The subsequent full Edge attempt reused the ownership-verified port-6080 preview with `PLAYWRIGHT_EXTERNAL_SERVER=1`, so no second Vite server was started. Before cancellation, five tests passed and three failed: campfire rest, closed test chest, and the new-save quest test. The 49-test suite was interrupted after the failures were established and is incomplete, not passing. Its log is `output/movement-finalize-edge.log` and artifacts are under `output/movement-finalize-edge/`. No unrelated gameplay or tests were changed to resolve these failures. Earlier successful focused checks below remain historical evidence.

## Mouse travel courtesy update

The latest checks pass 245 unit tests and type checking. Mouse preview and travel are capped at 30 cardinal steps per gesture, independent of attributes and layout. Trap cells remain in the preview with red dots; movement stops before the first unconfirmed trap, and a fresh adjacent click confirms crossing only that trap. Keyboard input clears any old mouse confirmation. Closed-door behavior is unchanged.

Playwright CLI Edge passed `trap-routing-check.js` in all three modes, verifying full previews, a red hazard dot, the courtesy stop at cell 52, and second-click arrival at cell 56. `mouse-travel-limit-check.js` passed in all three modes at quarter Zoom: a target 40 cells away showed 30 dots and stopped exactly 30 steps away, without later continuation. Both groups reported zero page/console errors and are included in the configured movement browser spec. The React review retained transient travel budgets and confirmations in refs instead of adding per-frame state.

## Playtest follow-up

The latest `npm test` run passes all 243 tests, including 14 focused movement tests. Type checking and strict OpenSpec validation pass. The earlier counts and browser results below document the initial implementation, not a new full-suite run.

`movement-feedback-check.js` passed in Playwright CLI Edge with zero console/page errors. It tests all eight WASD/arrow keys in each mode after a genuinely focused dropdown selection, release stops, and both mouse buttons completing centered Gridless destinations with run-to-idle transitions. The configured movement browser spec also includes this repeatable check. Unit coverage verifies directional run clips loop, explicit stopping clears locomotion, discrete modes do not use it, Gridless has no hop pulse, and initial recentering adds no turn.

Gridless mouse travel now snaps to the occupied center before departure, follows the legal cardinal route smoothly, and finishes at the destination center. Keyboard Gridless travel still allows arbitrary whole-pixel stops. This supersedes the initial clicked-pixel destination evidence below. The shared selector handler returns focus to gameplay; keyboard listeners no longer reattach for every campaign update. Animation stops are explicit, avoiding timeout-induced flicker on slow frames.

The owned port-6080 preview was reused without stopping unrelated processes. A failed legacy-PowerShell helper invocation left an empty lock; its exact creation time and empty contents were verified before removing only that newly created directory and rerunning the helper under PowerShell 7. Fresh desktop Edge and IAB loads each showed the playable dungeon, three canvases, completed preparation, and no new errors after reloading old hot-reload class instances. Existing saves were preserved. The React checklist kept transient animation state outside React rendering and avoided unnecessary event-listener reattachment.

## Initial focused checks

`node --import tsx --test rogues-dungeon/test/movement-modes.test.ts` passes 13 tests covering preferences, legacy precise positions, single-cell ownership, center crossings, cardinal and diagonal movement, speed at 30/60/120 updates per second, pickup entry, blocked corners, trigger/stair entry, trap death interruption, Perception migration, range and line of sight, closed/open doors, Battle independence, turn-free alignment, player presentation, cursor legality, and existing path/reticle invariants.

The final `npm test` run passes all 235 tests, including concurrent additions. `npm run typecheck` passes. The four earlier baseline test failures were repaired in the separate user-requested chat "Fix four pre-existing dungeon test failures", without production changes. Source assertions now check the current generated Wang mapping and the current 500ms pickup animation rather than superseded constants; gameplay was not changed to satisfy these assertions.

## Live browser evidence

The project-owned preview was verified and reused at port 6080 through the run-start helper. All navigations used `/blockchain-rogues-dungeon-game/?mute=1`.

Playwright CLI used Microsoft Edge in an isolated profile. The repeatable focused check is `rogues-dungeon/test/browser/movement-mode-check.js`. It passed with zero page or console errors and verified:

- Each mode completed a released three-cell click. Grid-snap and Grid-tween stopped at cell-center pixel x=1712; Gridless stopped at clicked pixel x=1717. Each route advanced three turns.
- Keyboard release preserved the exact saved whole-pixel position without later drift. Pure integration tests verified normalized diagonal speed and sprint independently of frame cadence.
- Existing cardinal and diagonal previews retained one and two dots. Changing Zoom from 1x to 2x retained cell alignment and scaled dots from 4 to 8 CSS pixels.
- A hidden enemy triggered Battle. A held directional key and a distant click each requested one step, including with the Screen camera. Leaving awareness restored General and retained the Gridless preference without continuing a stale destination.
- Hidden enemy hover exposed neither a tooltip nor a combat cursor. Entering detection range made both available; leaving detection range cleared the tooltip without pointer movement and did not end Battle.
- Battle used a computed 2px inset border before and during fullscreen, and leaving fullscreen restored view geometry.
- Blur and Settings cancelled automatic click travel.
- The game screen and canvas existed, renderer preparation completed, and no WebGPU-unavailable message appeared.

Desktop Edge through `cua_repl` and the in-app browser each loaded an existing save, displayed the dungeon and Movement control, contained three canvases, completed renderer preparation, and had no console errors. Existing user browser storage was not reset.

Validated screenshots are `.impeccable/review/desktop.png` and `mobile.png`, showing Battle in landscape and portrait. The narrow UI review's keyboard-focus and tooltip-wrapping findings were fixed; its verdict pass scored those findings resolved. The mechanical UI detector returned no findings. A read-only documentation review confirmed that the addition preserves incumbent styles without creating a new design system.

## Full browser suite and known baseline issues

The verified port-6080 preview tree was stopped with ownership checks and the shared startup lock before attempting `npm run test:browser:full`. Diagnostic logs were retained.

The initial port conflict cleared. After a second ownership-verified preview shutdown, `npm run test:browser:full -- --project=edge` ran all 28 configured Edge tests, with 13 passing and 15 failing. This is not a full-suite pass. The run also reported missing trace files while another browser run shared `output/playwright`.

The movement-specific failures were investigated and repaired in tests, without changing gameplay. The sprint and retargeting tests used version-3 synthetic saves, which current migration regenerates instead of preserving their hand-built corridors. Both now use version-5 saves with explicit cells and wait for renderer readiness before sending input. Retargeting passed in the isolated follow-up run, and sprint passed in its subsequent isolated rerun.

`movement-modes.spec.ts` now runs the existing standalone movement check inside the configured suite. The isolated Edge run passed this complete group in 51.4 seconds with zero page or console errors. It also passed retargeting. The corrected sprint rerun passed in 5 seconds. Artifacts use `output/movement-verification` and `output/movement-sprint-verification` to avoid concurrent output deletion.

The other 13 failures from the original full run remain recorded, not waived or counted as passing:

- Campfire input before renderer readiness and chest assertions against compact persisted entity arrays.
- Duplicate desktop/mobile quest locators, the moved Clear Local Storage control, Settings geometry, How To Play trace-file loss, map-export controls, Tab focus policy, and keyboard-tray tab selection.
- Equipment-swap comparison presentation, the barrel/trigger version-3 fixture, and two obsolete Dev Settings/Aspect selectors.

These broader tests were not rewritten as part of this movement implementation. Browser regression cleanup remains necessary before claiming a clean repository-wide browser suite. The movement implementation and its targeted checks are complete; archival should retain this explicit full-suite caveat.

Portrait layout is also being changed in the separate `support-small-browser-display` work. Unrelated layout, Wang, campfire, and documentation edits were preserved.
