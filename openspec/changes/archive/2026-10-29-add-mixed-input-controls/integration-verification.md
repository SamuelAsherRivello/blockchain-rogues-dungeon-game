# Current shared-source integration checks

Verified on 2026-10-29 for `add-mixed-input-controls`, on `main` at HEAD
`8cc51af4f88880b5fa3376400d1e03a0028128a2`, including the existing uncommitted
shared changes. Mixed-input acceptance passes. The four TypeScript errors found
in Jewel and Lockbox tests were subsequently corrected in the shared working
tree. The finalization readiness check passes type checking and all 21 affected
tests, without changing their runtime assertions.

Finalization readiness also reran all three controller Edge cases after the
latest shared Game edits: 3 passed in `output/mixed-input-finalize-browser.log`.
The monitored input, renderer and affected-test hashes stayed unchanged during
that check; see `output/mixed-input-finalize-source.json`.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Fresh configured Node suite after shared runtime edits | 543 passed, 0 failed, skipped or cancelled | `output/mixed-input-integration-node-current.log` |
| Current-source controller suite in Microsoft Edge | 3 passed | `output/mixed-input-integration-current-browser.log` |
| Broader related Edge integration group | 16 passed | `output/mixed-input-integration-browser.log` |
| Standalone Edge mixed-input acceptance | All four assertion groups passed; no console errors | `output/mixed-input-integration-reticle.log` |
| Supplemental world-sprite unit checks | 6 passed | `output/mixed-input-integration-renderer-supplement.log` |
| Finalization type checking | Passed after shared test corrections | `output/mixed-input-finalize-typecheck-fixed.log` |
| Affected Jewel and Lockbox tests | 21 passed | `output/mixed-input-finalize-affected-tests.log` |
| Strict OpenSpec validation at readiness | Passed; Apply was `all_done`, 6/6 before archive | Recorded CLI results |
| Scoped whitespace check | Passed | `git diff --check` |

The three current-source controller cases cover left stick/D-pad movement across
all movement modes, Battle and focus interruption; mouse/right-stick ownership,
eight neighbors, triggers, world prompts and panel-drag/text-focus suppression;
and object/enemy bumps across all movement modes.

The broader group covers campfire prompts, equipment and quick-slot swaps,
Gridless interaction timing, fogged mouse travel in all movement modes,
movement/Battle/path previews, dropdown focus, trap routing, travel limits,
renderer startup and the unarmed Battle tip. Its completed run spans concurrent
shared-source updates, so the controller cases and full Node suite were rerun
after those updates. No claim is made that the entire wider project browser
suite passed.

## Resolved compiler failures

- `rogues-dungeon/test/jewel-art.test.ts:43` and `:45`: TS7022 for the inferred
  `source` and `alpha` variables.
- `rogues-dungeon/test/jewel-interface.test.ts:50`: TS2345, a string is passed to
  a parameter requiring the item-name literal union.
- `rogues-dungeon/test/lockbox-storage.test.ts:200`: TS2339, `state` is accessed
  without narrowing the queued-action result union.

The initial check reported 44 renderer diagnostics. Concurrent shared work
corrected those before the next check. The four test diagnostics listed above
were then corrected with explicit numeric annotations, a literal item-name
tuple, and queued-action result narrowing. These corrections were already
present when the user requested the fix; this owner verified and preserved
them. The earlier failed logs are retained, and the latest compiler and affected
test logs establish that this blocker is cleared.

## Browser contexts and ownership

All browser URLs included `?mute=1`. The existing project-owned Vite server on
port 6080 was verified against this checkout and reused. The Edge suite used
`PLAYWRIGHT_EXTERNAL_SERVER=1` and `PLAYWRIGHT_PORT=6080`, so it launched no
additional server. Its artifacts have separate output directories from the
other owner's running wider suite.

- Playwright CLI with Microsoft Edge: mixed-input acceptance passed with a
  simulated standard controller and zero console errors.
- Desktop Edge connector: final source showed the playable dungeon and minimap,
  two canvases, no preparation/unsupported message and no console errors.
- Built-in browser: final source showed the playable portrait dungeon, one
  canvas, no preparation/unsupported message and no console errors.
- Physical controller: not tested.

The final Node/controller source window began at `2026-10-29T12:49:19.9292368Z`.
All files in `output/mixed-input-integration-source-current.json` still matched
`output/mixed-input-integration-source-end.json` after those checks. Earlier
source changes and the initial checks are retained separately in
`output/mixed-input-integration-source-start.json` and the unsuffixed logs.

All verification-owned CLI and connector tabs are closed; both owned test
processes have exited. Existing shared servers and the other owner's wider
suite were not stopped. The integration run changed no production source, tests,
task checkboxes, branch, commit or archive state. The subsequent authorized
finalization syncs the main spec and archives this change. Source and browser
ownership is released.
