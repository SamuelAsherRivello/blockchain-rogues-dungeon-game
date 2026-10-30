# Implementation evidence and browser handoff

## Frozen implementation

The four appearances contain 192 mapped frames across 40 clips. Original PNG
bytes and the shared shadow are unchanged. The shared sprite-sheet skill's
acceptance checks passed for both original libraries and six variant libraries.
The pixel validator confirms zero changes outside approved repair masks,
source-only colors, binary alpha, and unchanged native canvases.

The renderer loads all appearances once during its existing floor setup. Its
effect dependencies do not include equipment. Equipment changes select an atlas
frame using the existing animation clock and main/shadow sprite handles.
Qualified keys distinguish cells from the same sheet. Bitmap decoding closes
successful resources even when a sibling image fails. Existing mirroring,
offsets, depth, lighting/tint caching, and stair clipping remain in their
original rendering paths.

The 23 focused Node tests passed after integration, including source-file
dimensions, all mappings, timing continuity, equipment occupancy, death latch,
shared-sheet decoding, and resource disposal. All seven Python asset-validator
tests passed, including missing variant mappings and changed original PNG bytes.
The temporary fixture uses the ignored workspace output directory and creates
that parent on fresh checkouts. Original artwork is never modified by tests.

Fog's final corrected shared gate passed 570/570 Node tests, 36/36 supporting
tests, typecheck, and production build. Its 799-file snapshot digest was
`b82f2f679b6e1fd1c3317ae2fe458da743b2cb02ed6fac09ce25c34e04a8bec0`.
Logs are `output/fog-oct29-r8-corrected-node.log`,
`output/fog-oct29-r8-corrected-supporting-node.log`, and
`output/fog-oct29-r8-corrected-build.log`. After that gate, the only test-source
change was creating the temporary output parent; all seven Python tests passed
again. No runtime or art source changed in that test-only window. The Python
checks also passed independently on the host, recorded in
`output/fog-r8-python-tests.log`. OpenSpec strict validation passed. The earlier
544-test result predates integration and is superseded by the corrected gate.

## Final integrated gate on 2026-10-29

After the separately owned pickup-offset change froze, the combined final
snapshot passed 571/571 main Node tests, 36/36 supporting tests, all seven
Python asset tests, typecheck, and production build. The entire configured
browser suite passed 160/160 cases, 80 Chromium and 80 Edge, with zero failures
in 27.4 minutes. The 799-file runtime/asset/test manifest remained unchanged
throughout the browser run, with SHA-256
`e180038be8eb9aa18581be55384ecc233aa84e400a1c7818b22df2496b4fec3b`.

The final logs are `output/fog-oct29-combined-node.log`,
`output/fog-oct29-combined-supporting-node.log`,
`output/fog-oct29-combined-build.log`, and
`output/fog-oct29-combined-browser.log`. The earlier 570-test gate above remains
historical evidence; the 571-test combined run is the final integration result.
The owned 6080 preview was stopped before the configured 4173 suite server
started. The preview was restored after the full browser run, with monitor
restoration handled by the coordinator under the user's explicit approval.

All six isolated RT comparison samples passed the capture guards. RT3 averaged
119.9 FPS at both 100x100 and 200x200 in that Edge run, with no static rebuilds,
normal-save changes, or console errors. Accepted raw data is in
`rogues-dungeon/documentation/fog-and-lighting-performance.json`. Its separate
740-file runtime/public/config manifest remained unchanged, SHA-256
`b5b6f5cb14d295a88118e97eb3dcf9df881113c8bbe03a43add5a9c603e4ab19`.
These are measurements on this host, not a universal performance guarantee.

All 40 clips and 192 mapped frames are delivered. No requested appearance or
clip is deferred. Original-frame and shared-shadow encoded hashes were checked
again during final evidence reconciliation. Strict OpenSpec validation passed.
Desktop Edge was initially unavailable. The user subsequently connected the
desktop browser extension, and the owner completed that separate context as
recorded below. No unavailable-context exception was needed.

## Measured browser coverage

CLI Edge used RT3 on the shared muted server and passed all four committed
appearances, projected/canceled weapon drag, rejected Armor-to-Weapons drag,
Jewel independence, retained connected world canvas, occupied reload, cardinal
facing, and Gridless west-facing run/side frame 3. It reported 15 checks and zero
application console/page errors. Evidence is
`output/fog-r8-appearance-result.log` and screenshots
`output/fog-r8-{both,shield,sword,grid,gridless-west}.png`.

The CLI lifecycle check retained the fatal sword-and-shield appearance through
death frames 0–5 and showed unarmed after Adventure restart, with zero errors.
The final stair check waited for the old canvas to disconnect and the full
world-alive false-to-true transition, then confirmed arrival on level 2.
Evidence is `output/fog-r8-lifecycle-result.log` and screenshots
`output/fog-r8-{death,restart,stairs}.png`. Earlier stair logs that observed the
old canvas before departure ended are diagnostic drafts, not acceptance.

IAB used RT3 and normal item collection/equipment UI to measure all four states:
Suit of Armor produced shield-only, adding Sword produced sword-and-shield,
removing Armor produced sword-only, and removing Sword produced unarmed. The
playable world canvas and minimap were present, with zero console errors. The
gate owner used a confirmed empty slot 2 and supported item-test mode while
preserving occupied slots 1 and 3.

The R8 owner subsequently completed the missing IAB checks through normal UI
actions and read-only DOM observations on the same 6080 server. An abandoned
armor drag preserved appearance, inventory, and position. A rejected Wooden
Vest-to-Jewels drop preserved shield-only. Committing Leg Armor and Wand selected
sword-and-shield, confirming that group occupancy determines the art.

Natural enemy attacks reduced the equipped player to zero health. The observed
death frame 1 retained sword-and-shield, as did the recap; Restart Level created
a ready unarmed actor with empty equipment and restored health. IAB does not
have the CLI's exhaustive death-frame sampling, and no such claim is made.

The supported `corridor-joins` fixture was traversed from 42,42 to the stair at
61,59. Arrival was confirmed on a new level-2 map context
`31421702:2:dungeon`, renderer-ready and world-alive, at 49,50. One selector wait
expired before arrival; the subsequent actual DOM and screenshot confirmed
completed arrival. This was a readiness observation, not an application error.

Actual saved reload used only the test-owned slot 2, without a complete-identity
unsaved fixture. After Leg Armor was committed, navigating to the normal muted
route and reopening that save restored shield-only at the same floor/50,54
position. Occupied slots 1 and 3 were never opened or changed. Gridless west
movement was verified in the open room from 50,53 to 48,53 with side art; an
initial west attempt at the doorway was correctly blocked by walls. Grid-snap
was restored before handoff. Final readiness showed two canvases, a minimap,
RT3, no unsupported-WebGPU message, and zero console errors.

Exact DOM samples and observations are in
`output/r8-iab-completion.json`. Screenshots are
`output/r8-iab-{death-recap,restart,before-stairs,after-stairs,before-reload,after-reload,final}.png`.
Inventory arrays in DOM samples reflect visible inventory widgets; the Control
panel hides those widgets and does not establish an empty underlying inventory.
The owned IAB tab was closed before releasing the runtime to Fog's full suite.

Desktop Edge was initially absent from the available browser inventory. Both
the gate owner and coordinator confirmed that earlier limitation. On
2026-10-29 the user connected the extension and the browser appeared as Edge
extension browser 4. The dedicated desktop scenario then passed all four
committed appearances, abandoned drag, rejected Armor-to-Weapons drop, normal
cardinal movement, and a held Gridless west input that displayed `run/side`
frame 5 in the clear fixture. Grid-snap was restored afterward.

Natural enemy damage produced an observed death frame 0 with the fatal
sword-and-shield appearance. The recap retained that appearance; Restart Level
returned a fully alive, renderer-ready unarmed actor with empty equipment.
The supported stair fixture completed arrival on level 2 at 49,50. A normal
existing Saved Game 1 was opened without gameplay or equipment actions, then
the page was reloaded and the save reopened. It resumed the same unarmed
player-home campaign at 2,8, matching the empty equipment shown in the UI.
Occupied reload is independently covered by CLI Edge and IAB above.

All desktop equipment/death/stair mutations used complete-identity unsaved
fixtures; no existing normal save was intentionally written. Final desktop
checks showed RT3, two canvases, the minimap, world-alive and renderer-ready,
no unsupported-WebGPU message, and zero console errors. Raw observations are
in `output/r8-desktop-edge-completion.json`; screenshots are
`output/r8-desktop-edge-{both,death,west,stairs,final}.png`.
An early movement sample's generic health selector included an enemy tooltip;
subsequent fatal samples explicitly read the player's health button. Initial
restart observations preceded world-alive; final acceptance waits for the
loading message to disappear and world-alive to become true. Desktop visual
capture in a background browser is separate from the isolated FPS comparison.
The owned desktop scenario tab was closed after saving the final evidence.
On 2026-10-29 the user reviewed the Hero-specific comparison video and answered
"Looks correct" in the coordinator chat. The user also confirmed in this owner
chat, "The animations look good. Continue with the remaining browser checks and
finish the Apply tasks." This is visual acceptance of the four delivered Hero
appearances, separate from the earlier shared-skill demo review.

## Shared browser gate

The orchestration coordinator is `01a18774-0e41-7a90-bad8-d8f0bf38237c`.
The browser gate owner is `01a16a3c-f8f6-76e2-ab27-0216debd3630`.
Use the existing owned server at
`http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1`.
Explicitly select RT3 and preserve the existing fog/light cache. Do not start a
second server. Complete the same scenario in Edge Playwright CLI, desktop Edge,
and IAB. Final browser-suite execution must stop the owned server before the
configured suite server starts, as required by project guidance.

Read `.world-view.dataset.playerAppearance`, `playerAnimation`, and
`playerFrame` as observable presentation diagnostics. Expected appearances are
`unarmed`, `sword-only`, `shield-only`, and `sword-and-shield`. Minimap markers
remain independent of hero art. Use current readiness/drag helpers rather than
copying older helpers that assume bounding boxes are immediately available.

1. Seed a current-compatible saved campaign with empty Weapons/Armor, two
   compatible equipment items in Inventory, an open movement area, and a
   reachable stair. Declare the current development compatibility marker before
   writing save data. Existing campaign fixtures provide the normalization.
2. Open Saved Game 1. Wait for renderer readiness, the loading message to
   disappear, and iris transitions to finish. Confirm playable canvas, no
   unsupported-WebGPU message, set 4, and no console/page errors.
3. Drag an Inventory item over Weapons without committing, then cancel. Set 4
   must remain selected. Commit to Weapons and verify set 2. Add Armor and
   verify set 1. Remove Weapons and verify set 3. Remove Armor and verify set 4.
   Repeat changes and retain the same world canvas. Jewels must not change art.
   A rejected destination and a canceled replacement must preserve appearance.
4. Reload a saved occupied combination and verify that slot occupancy restores
   its expected appearance. Move north, south, east, and west. Inspect west
   mirroring, grid hops, Gridless running, damage/tint, depth, and minimap marker.
   Equipment changes must not restart idle/run playback at frame zero.
5. Exercise the reachable stair and fatal-player fixture using the existing
   browser patterns. Fatal equipment must remain visible throughout death;
   the empty replacement run must use set 4. Capture representative screenshots
   and record observed animation/appearance/frame diagnostics and console state.

Task 4.2 is complete following the measured CLI scenario and the user's explicit
Hero comparison approval. Task 4.4 is complete from the CLI Edge, IAB, and newly
connected desktop Edge scenarios above. The user chose to connect desktop Edge
rather than accept a reduced verification scope. Task 5.1 is complete from the
focused and integrated checks; task 5.2 records the completed final gates and
strict OpenSpec validation. All requested Apply work is complete. All scenario
tabs owned by these verification sessions were closed. No sync, archive,
commit, or push is part of this Apply handoff.

## Reproducible focused checks

```text
python scripts/validate-player-animation-art.py
python rogues-dungeon/test/player-animation-art.test.py
python scripts/publish-player-animation-libraries.py
node --import tsx --test rogues-dungeon/test/hero-warrior-appearance.test.ts rogues-dungeon/test/hero-warrior-visual-frames.test.ts rogues-dungeon/test/hero-warrior-atlas.test.ts rogues-dungeon/test/hero-warrior-catalog.test.ts rogues-dungeon/test/sprite-sheet-animation-system.test.ts
npm test
npm run typecheck
npm run build
openspec validate add-player-equipment-animation-sets --strict
```

Publication revalidates all six current skill deliveries and refuses conflicting
existing runtime files. No art-authoring or revision script needs rerunning.
Human review of the Hero-specific comparison video remains separate from
earlier approval of the shared skill's demo video.
