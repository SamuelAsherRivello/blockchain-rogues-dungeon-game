# Generation milestone-1 verification, 2026-10-25

Coordinator/root chat `01a17384-49d7-78c2-ab8d-a242e90b3156`. Program: [all active proposals](../../programs/all-active-proposals/program.md).

## Evidence

Initial HEAD `6a928e97d9b78be2aec3232f2812aa55cd5d3103`, with existing dirty UI/prefab edits. Fog implementation began concurrently in its enrolled owner. This verification owner edited no production source.

Before the browser checks, `level-grid-system.ts` SHA256 was `49CC83DA838C0515B4CA5E63D5AF11A4D731DA99282EDADF12E464ED1B734171`; renderer SHA256 was `536FC0117F978B5C3890A699773963E7A9EAB8D529B6880819875E40BCECAF8D`. Generation source subsequently changed under the fog owner, so final integration evidence must identify the resulting snapshot again.

`node --import tsx --test --test-name-pattern='level passes|reconstructs deterministic floors|generates deterministic width-aware|round-trips actor|run identity produces' rogues-dungeon/test/game.test.ts` passed five selected tests. These cover scoped/protected pass writes, stable run identities, compact delta persistence, Tiled repair round trips, and connected deterministic corridors.

`output/program-generation-check.ts` generated seed 1 and 2 with slot 2/run 1/world 1/level 1 twice each. Semantic cells and entity lists matched, serialized campaigns had no `map` field, dimensions were 100x100, and both stairs were reachable. Both pass sequences were `structured-dungeon`, `reserve-semantic-cells`, `place-dungeon-objects`, with zero diagnostics. Seed 1 floor seed was 1638621706; seed 2 floor seed was 3672583954.

Focused Playwright CLI Microsoft Edge 156 checks reused verified Vite PID 6336 on port 6080. Isolated in-memory browser session `program-verification` used full unsaved run identity and `?mute=1`; normal saved-slot keys remained absent.

- Seeds 1 and 2 rendered two canvases with no unsupported-WebGPU message and zero application errors. Right/left movement worked for both.
- The first stair-route attempt correctly encountered the existing puzzle's closed exit door at (54,50). It was a test setup omission, not an accepted game failure. The route needed to push the barrel onto its trigger first.
- Corrected route from (50,50): Left 3, Down 2, Right 1 to push the barrel, Up 2, Right 8. Input was paced by 350ms after each committed step.
- Both corrected routes reached level 2 with renderer ready, no iris remaining, and zero page errors. Screenshots: `output/program-seed-1-level-two.png` and `output/program-seed-2-level-two.png`.
- Node `output/program-route-check.ts` independently confirmed the barrel-push and stairs-entered events for both seeds.
- IAB showed the seed-1 dungeon and minimap, two canvases, no Preparing/unsupported message and zero error logs. Desktop Edge via CUA was not listed in available browsers.

## Required human gate

The user answered the pending two-seed playtest request on 2026-10-25 with: "Both seeds passed". Together with the automated smoke/route evidence above, this completes task 1.9's required human feedback. Milestone 2 is unblocked by that gate, but shared source edits still serialize behind the active fog/lighting owner. Milestone-2 and milestone-3 playtest gates remain unchanged.

Human instructions use the full unsaved run URLs, preserving normal saved campaigns. For each seed, wait for the iris to finish, use Grid-tween or Grid-snap, press Left three times, Down twice, Right once to push the barrel, Up twice, then Right eight times. Verify the door opens, the room has no visual seams, movement works, and the stairs lead to level 2. Wait for each movement to settle before the next press. Record seed-specific success or the first failing step.

The program has not accepted this proposal complete. Later fog/lighting integration requires a new stable-source verification snapshot, and final Node/type/browser gates remain pending.

## Milestone two implementation verification, 2026-10-25

The coordinator released `world-procedural-system.ts` and `game/types.ts` after
the diagnostics persistence work. The generation integration preserves the
complete-profile baseline cache, its warmup path, optional `floor.seed` fallback,
action instrumentation and diagnostics-owned persistence/UI files.

Tasks 2.1 through 2.5 are implemented. New runs explicitly select
`dungeon-graph-1`; missing historical profile versions retain the legacy chain.
Direct generation remains legacy unless explicitly versioned. Room placement
enforces bounds/clearance and reservations. Tree/loop links retain actual routed
sockets and segments, and exit metadata includes the actual stair attachment,
including the sealed chamber. Role priorities operate within existing budgets.
Structural and final quality checks validate all required walkable markers,
actual corridor footprints, room reachability and entity placement before
activation. One bounded connectivity repair may run and retains its diagnostics.
Unknown topology versions reject before profile mutation.

The documented command in `world-generation.md` passed all 22 generation tests.
It covers graph determinism/connectivity/roles, widths one through five,
reservation detours, a 200-by-200 layout with 40 rooms, invalid quality fixtures,
actual stair/graph agreement, 48 extreme world-control combinations, an authored
home portal, compact saves, retries and unsupported versions. The permanent
legacy fixture contains six direct outputs and three captured compact saves;
all nine exact geometry/placement hashes remain unchanged, including a second
compact round trip.

`npm run typecheck` passed on the integrated source. Existing regression groups
initially reported 63/64 and 190/191, each with the same world-growth recovery
failure. The draft had accidentally changed the existing policy for rebuilding
a retry baseline after world growth. That change was removed while retaining
the floor's topology family. The targeted existing test, `earned world awards
survive partial spending, batching, death and reload exactly once`, then passed,
and the complete 22-test generation command passed again. All other checks in
those groups passed, including the existing 100-seed extreme-attribute sweep,
encounter lockdown, turn/combat/inventory, compact persistence, discovery,
recovery and diagnostics performance contracts. Those broad groups loaded the
pre-fix module, so they are not claimed as full green finalization runs.

Integrated snapshot SHA256 values:

- `world-procedural-system.ts`: `DF3150C0C4975E17E1608963E6458F3B0DB3B5207E7DDAC86E4234AF53DB4DDB`
- `game/types.ts`: `3F0D50AB35440BDBADE13ED790745D185E28FFFDB247E647C112A2CEDCFCD769`
- `dungeon-graph-layout-system.ts`: `255451D09743C8298AB015CDC3ED52D0919DB6FBA225C4FA13A1BB24C7A063C5`
- `dungeon-topology-system.ts`: `157B7539CD0BA6B95A841372728E3BB424E3F6278A5B5820F336690C84925019`
- `dungeon-quality-system.ts`: `2296FCEE8C68F8C84E31C84FEDF4DC6899572690DA93E2E28D416544A66169CA`

The exact OpenSpec task refresh/update loop verified progress after every
checkbox from 2.1 through 2.5, ending at 14/23 complete with state `ready`.
Task 2.6 remains unchecked. The coordinator owns the focused muted browser check
and second human playtest for branches, loops, pacing, combat spaces and stairs.
No browser/server operation was performed by this implementation owner, and no
milestone-three implementation has begun.
