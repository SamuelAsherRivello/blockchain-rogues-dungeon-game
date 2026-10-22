# Tasks

Both three-question reviews and their planning updates are complete. Confirmed decisions include turn-free Battle-entry centering, complete hiding of undetected enemies, and hiding again whenever Perception range or line of sight is lost. The former path/reticle conflict is resolved in favor of current code. Existing dotted-path code is baseline work, not claimed as newly completed implementation.

## 1. Complete planning review

- [x] 1.1 Re-read the authoritative path/reticle implementation and reconcile its complete/approach routes, palette priorities, endpoint-dot exceptions, and adjacent bump behavior across proposal, design, mouse-path-navigation, and dungeon-turns; verified against source and strict OpenSpec validation under the user's explicit code-as-truth decision.

## 2. Player movement and time

- [x] 2.1 Add validated movement-mode preferences and precise world-pixel player position normalization; verify old saves start at cell centers and absent/invalid preferences default to Grid-tween with focused persistence checks.
- [x] 2.2 Implement single-cell ownership and blocked-cell validation for whole-pixel travel; verify cell-edge ties, walls, occupied cells, diagonal corner constraints, pickups, triggers, stairs, and once-only entry effects with domain tests.
- [x] 2.3 Implement ordered center-line crossings and tactical ticks; verify cardinal, exact diagonal, near-diagonal, long-frame, reverse, stop/resume, death, and floor-transition cases with focused domain tests and document the confirmed timing rule.
- [x] 2.4 Separate player Grid-snap/Grid-tween/Gridless presentation from enemy and barrel playback; verify immediate placement, existing 250 ms retargeting, shared minimap/camera coordinates, and unchanged enemy staging with presentation tests.
- [x] 2.5 Integrate keyboard two-axis continuous movement and General full-destination one-click mouse travel in all three movement modes, including input cancellation and frame-independent speed; verify mouse release does not cancel a clicked route, keyboard release stops free movement, and sprint, blur, modals, and route reuse behave as documented.
- [x] 2.6 Replace unused Vitality with Perception across contracts, character rolls, progression, UI/tooltips, item modifiers, and save normalization; verify exactly ten attributes, Perception integers 0..99, unchanged 30-point rolls, legacy rank preservation, and no health/progression resets with focused tests.
- [x] 2.7 Implement independent line-of-sight enemy detection with two cells per positive Perception point and the documented 1-cell zero-value assumption; verify 0, 1, 4, 5, and 99, inclusive range edges, walls, closed/open doors, diagonal corners, and recomputation after movement or attribute changes with domain tests.
- [x] 2.8 Apply current detection consistently to enemy sprites, shadows, silhouettes, minimap markers, tooltips, and identifying cursors without removing authoritative enemies or altering terrain; test initial hiding, hiding again on lost range or line of sight, reacquisition, stale hover clearing without pointer movement, and no persistent reveal or last-known marker. Verify hidden enemies still collide and act, low Perception can leave Battle active with an undetected enemy, high Perception can detect before Battle, and document range tuning and migration assumptions.

## 3. Battle and visible controls

- [x] 3.1 Implement General/Battle from living-enemy effective awareness using the existing distance rule independently of Perception, line of sight, and walls; preserve selected movement mode and verify blocked-line threats, low-Perception threats, death, multiple enemies, out-of-range exit, and stale input cancellation with state-transition tests.
- [x] 3.2 Enforce one click or fresh directional press per legal Battle step and its ordinary action charge; tween an off-center Gridless player to the occupied cell center on Battle entry without a time increment, extra turn, or alignment enemy phase; verify keyboard repeat, long routes, screen-edge advance, and centering cannot add steps or duplicate turns.
- [x] 3.3 Add the monochrome walking-person Movement dropdown immediately right of Camera and the 2 px red inset Battle border with accessible state text; verify selected values, tooltip/accessible name, unchanged view dimensions, both aspects, and fullscreen, and document the two states.
- [x] 3.4 Add contextual cursor intent and local assets/hotspots with native fallbacks following the design table; verify reachable ground, interaction, combat, blocked push, UI/help/drag precedence, and passive minimap with focused resolver checks and record asset provenance. The approved crate mapping is interaction, matching the current resolver.

## 4. Existing preview and integration verification

- [x] 4.1 Preserve and regression-check the existing dotted mouse path and reticle rather than reimplement them; verify ordinary cardinal/diagonal dot counts, origin and selected-green-endpoint exclusion, intermediate green dots, red/green priority over false exact reachability, invalid player-cell reticle, reachable approaches including closed-door stops, adjacent bumps, shared palette, zoom-scaled dots, same-cell search reuse, and camera/Zoom/resize alignment.
- [x] 4.2 Run npm test and npm run typecheck after integration; verify both pass and any failure is investigated without overwriting unrelated working-tree edits.
- [x] 4.3 Start one owned server on a safe port such as 6080 through ai-skills-project-run-start and run one focused Playwright CLI Edge group at /blockchain-rogues-dungeon-game/?mute=1 after related implementation is complete; verify mode selection, pixel stops/ticks, turn-free Battle centering and one-step restriction, enemy hiding/re-hiding on lost range or line of sight and reacquisition, stale tooltip/cursor clearing, cursors, dots, a visible .game-screen and canvas, no WebGPU-unavailable message, and no console errors.
- [x] 4.4 Check the same muted URL in desktop Edge and the in-app browser through cua_repl; verify playable dungeon visibility, canvas presence, no console errors, completed renderer preparation, and record evidence for both contexts.
- [x] 4.5 At finalization, stop the owned server before the configured browser suite starts its port-4173 server, run applicable full browser coverage, and record results or concrete unavailable capabilities before archival.

## 5. Playtest feedback

- [x] 5.1 Restore WASD and arrow input immediately after choosing each movement mode, preserving discrete steps and continuous whole-pixel Gridless travel; regression-test real dropdown focus and keyboard release.
- [x] 5.2 Snap Gridless mouse travel to the occupied center before departure and destination center on arrival, with smooth whole-pixel path travel and looping run art between them, no hop or step tween, and idle on stopping; verify both mouse buttons, keyboard free stops, and unchanged grid-mode clips.

Follow-up verification: `movement-feedback-check.js` passed in Playwright CLI Edge with all eight movement keys in each mode, released-key stops, both mouse buttons completing at grid centers, run-to-idle transitions, and zero console/page errors. All 243 unit tests and type checking pass. Fresh desktop Edge and IAB loads each show a playable dungeon, three canvases, completed preparation, and no new errors. React review kept animation state outside React renders and removed unnecessary keyboard listener reattachment on campaign updates. The original full-suite caveat below remains historical; this follow-up ran focused browser coverage rather than claiming a fresh full-suite pass.

## 6. Approved mouse travel limit and trap courtesy

- [x] 6.1 Record the implemented fixed UX limit of 30 cardinal mouse-route steps, excluding the origin, for both preview and each click's travel; preserve keyboard behavior and verify that attributes, Zoom, camera, panel visibility, and route recomputation do not expand the budget. Existing unit coverage and `mouse-travel-limit-check.js` verify the cap in Grid-snap, Grid-tween, and Gridless.
- [x] 6.2 Record the implemented trap preview and courtesy behavior: red trap dots with the route continuing beyond them within the cap, a centered stop before each unconfirmed trap, fresh second-click permission to cross that adjacent trap only, and another pause at later traps. Preserve normal damage/time rules, keyboard entry, and closed-door blocking. Existing unit coverage and `trap-routing-check.js` verify red dots, stops, and second-click continuation in all three modes.

This planning-only reconciliation records already-completed work, not new implementation. The recorded mouse courtesy verification passed 245 unit tests, type checking, and the two focused Edge browser groups with zero page/console errors. Desktop Edge and IAB smoke checks completed renderer preparation with three canvases and no new errors after reload. See `rogues-dungeon/documentation/movement-modes-verification.md`. No gameplay code or tests were changed or rerun by this artifact update.

## Initial verification handoff

Finalization decision, 2026-10-22: the user explicitly approved finishing with recorded verification failures. The later pre-finalization run had 267/276 unit tests passing and two TypeScript errors. The full Edge attempt was interrupted after five passes and three failures, so it is not a full-suite pass. Details and log paths are in `rogues-dungeon/documentation/movement-modes-verification.md`. The checked tasks retain historical implementation evidence; this exception does not claim the current repository checks are clean.

Implementation and focused checks are complete. See `rogues-dungeon/documentation/movement-modes-verification.md` for evidence. The final run passes all 235 unit tests and type checking. The full Edge suite ran after the port conflict cleared and the owned preview stopped, with 13 passing and 15 failing. The two movement-specific test failures were repaired by modernizing synthetic save fixtures and waiting for renderer readiness; their isolated reruns pass. The complete movement browser group also passes with zero console/page errors. The remaining 13 broader browser failures and concurrent trace-output interference are recorded explicitly, not counted as passing. Task 4.5 requires running coverage and recording results, not claiming a clean full-suite result. No archive or commit was performed.
