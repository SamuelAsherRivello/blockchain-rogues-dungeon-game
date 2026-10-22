# Verification reconciliation, 2026-10-24

## Current result after the authorized fix

All ten checklist items are now complete. After the initial audit below identified the defect, the coordinator authorized its minimal production fix and regression coverage. The renderer now supplies `sizePx: [32, 32]` whenever it updates a minimap marker frame. This preserves the intended cell-sized colored dots. It adds no game-art texture, gameplay change, or experimental rendering mode.

The durable browser regression is `rogues-dungeon/test/browser/floor-trigger-door-barrel-set.spec.ts`, test `synchronizes generated puzzle pixels in both views and retains them after compact reload`. Its pixel decoder is `canvas-pixel-sample.ts`. It uses a real generated campaign and real compact storage, checks inactive marker pixels, observes additional active-color pixels when the door opens, compares game-door pixels, reloads, reuses the puzzle, and verifies release restores the original door pixels and marker state. The generated world's other open doors form the active-color baseline. The test uses Perf off and no response interception.

`npx playwright test rogues-dungeon/test/browser/floor-trigger-door-barrel-set.spec.ts --project=chromium --project=edge` passed all four checks against the repository source in 47.5 seconds. The new pixel/reload case passed in 16.6 seconds on Chrome and 16.2 seconds on Edge. Artifacts are under `output/archive-reconciliation/production-puzzle-browser/`, including closed, open, reloaded, and released screenshots for each browser. This satisfies task 3.3 against actual source.

Fresh `npm test` passed 340/340 tests. TypeScript and strict active-change validation passed. The unchanged before/after source digest was `41E3639AD71E78876DE55D7BF6E85D04228D431A6A3B1C30331C3686244B44FC`. See [fresh Node result](../../../../output/optimize-world-renderer/minimap-marker-final-node-result.json) and the adjacent Node, typecheck, and OpenSpec logs. `git diff --check` passed for the touched tracked files. Lint availability was inspected: no lint script or linter is configured, consistent with the already completed depth task 3.1. That unavailable check is reported, not claimed as executed, and no tooling was added. This records the applicable task 4.1 verification.

Fresh Playwright CLI Edge, desktop Edge, and IAB sessions all showed a ready game, two canvases, and no application console errors. The CLI check exercised P entry/exit, every C state, fullscreen, and tray-title collapse. Narrow desktop Edge temporarily used the 1280x720 verification viewport and exposed the secondary column, then reset that override. IAB's old off-map fixture was checked in a regenerated unsaved Perf world, which showed dungeon terrain and colored markers; Exit Perf restored the reference. Only agent-created tabs and disposable test contexts were closed.

The refreshed full browser matrix passed 122/122 checks, 61 Chrome and 61 Edge, in 16.6 minutes with no failures or skips. Its before/after source digest was unchanged at `20D74AA43F2C4DC5F00E4840BA01DFB66284E80966117F322E6F30D9D73A5E7E`. Evidence is [the fresh full result](../../../../output/optimize-world-renderer/minimap-marker-final-clean-browser-result.json), adjacent manifests/logs, and `minimap-marker-final-clean-suite/`. Production code matches the passing Node snapshot. The only intervening test changes give the four-context presentation case a bounded total budget and sample movement position/animation together; individual assertions remain intact. Earlier failures and their repairs are recorded in `output/optimize-world-renderer/presentation-budget-repair.md`. The earlier 120/120 result below is retained as history. No spec sync, current-change archive, staging, commit, or push was performed.

## Initial audit

This audit records new evidence against the archived checklist. It does not claim these checks ran on the original archive date. The initial audit preserved application source, tests, assets, package configuration, and current OpenSpec change artifacts. The later source authorization and result are recorded above.

## Evidence already available

The fresh integration gate passed 340/340 Node tests, TypeScript, strict validation of optimize-world-renderer, and 120/120 full browser checks, split equally between Chrome and Edge. Both gates recorded unchanged source digest `232371660155D875CDB907D1E99BF22F68F1EF3B9144C8511B301E0E5C09DA55`. The archive audit compared 721 runtime, test, asset, and configuration files against that gate and found no changed or added files. See [runtime equivalence](../../../../output/archive-reconciliation/runtime-equivalence.json), [Node result](../../../../output/optimize-world-renderer/browser-repair-final-node-result.json), and [browser result](../../../../output/optimize-world-renderer/browser-repair-final-browser-result.json).

The full browser gate includes the existing muted floor-trigger push scenario in both browsers. That scenario checks the committed barrel position, player position, retained rat, and visible WebGPU canvas. It does not verify puzzle colors in minimap pixels or reload the generated set, so its pass alone does not satisfy task 3.3 or the reload part of task 4.2.

The configured npm scripts and dependencies contain no lint command or linter. No lint run is claimed and no tooling was added. Node and TypeScript results do not substitute for a separate lint run.

## Narrow generated-puzzle check

The additional [Edge scenario](../../../../output/archive-reconciliation/puzzle-visual-reload-check.js) uses an isolated 1280x720, DPR-1 context at the muted port-6080 route, native zoom, Screen camera, Grid-snap movement, normal rendering, and Perf off. It creates the real `createRunCampaign(17, 1, 1)` campaign, floor seed 2225201261. It retains generated terrain, set identity, and set coordinates. Enemies are removed only in this disposable fixture to isolate puzzle movement, and the player starts at the valid barrel approach.

The scenario writes and reads the real compact save format before entering the game. It samples actual game-door pixels and minimap PNG pixels, pushes the barrel, reloads the saved game, pushes it again, then leaves the trigger. No human save or normal application response is changed.

The unmodified-source result confirms:

- The barrel moves from 48,52 to its trigger at 49,52, and time advances from 1 to 2.
- The logical door opens and the game-door pixel hash changes from 3781647278 to 4049749741.
- Reload preserves the generated set, barrel coordinate, time, open state, and identical open-door pixels.
- Another push after reload moves the barrel to 50,52. The player then holds the trigger, and time advances to 3.
- Leaving the trigger closes the door at time 4 and restores the original closed-door pixels.
- There are two ready canvases and no application console errors.

These observations, together with the fresh full suite, satisfy task 4.2.

## Failure found before the source fix

Before the source fix, the minimap image hash stayed 4111700520 throughout closed, open, reload, and released states. It contained no inactive blue puzzle pixels and no active purple puzzle pixels. The visible game view changed while the minimap did not. Tasks 3.3 and 4.1 therefore stayed unchecked during that audit. The source-level follow-up above supersedes that blocked state.

The cause is concrete. `babylon-render-system.tsx:626` updates each marker with a frame but no size. The installed Babylon Lite 1.32.0 implementation at `sprite-2d.js:167` resets width and height to `frame.sourceSizePx` when a frame is supplied without `sizePx`. Its palette frames are 1x1, so the intended 32x32 world markers become too small to appear at this minimap scale. The implementation behaves this way despite the nearby library comment saying frame and size are independent.

A second disposable context intercepted only its renderer-module response and added `sizePx: [32, 32]` to that update. Repository files were untouched. The same scenario then passed. Active purple pixel counts changed from 5 initially to 7 after the push, stayed 7 after reload, and returned to 5 after release. The initial five purple pixels belong to other generated open doors; the assertions compare against that baseline rather than assuming the world has no other active markers. Game-door pixels and all save/reuse assertions also passed. Closing that context removed the control.

See the [unmodified result](../../../../output/archive-reconciliation/puzzle-visual-reload-result.log) and [isolated control result](../../../../output/archive-reconciliation/puzzle-visual-reload-control-result.log). Screenshots in the same folder use `generated-puzzle-` for the unmodified source and `control-generated-puzzle-` for the temporary control.

The control diagnosed the candidate fix and was not used to complete task 3.3. The authorized source-level follow-up above supplies its completion evidence. Spec sync, current-change archival, and commits remain withheld as requested.
