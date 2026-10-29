# Mixed input verification

For the 2026-10-29 shared-source recheck, see
[current integration verification](integration-verification.md). Mixed-input
checks pass. The subsequent finalization check also passes type checking and
all 21 affected Jewel and Lockbox tests after their shared compiler fixes.

## Browser acceptance

Verified on the existing project server at `http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1` using Playwright CLI with Microsoft Edge and a simulated standard controller. No additional server was started or stopped.

- Left-stick and D-pad movement preserve free mouse targeting.
- Right-stick input immediately takes targeting without a button; newer mouse motion persists against an unchanged held stick.
- All eight adjacent targets remain bounded while holding directions.
- Keyboard movement overrides held controller movement, without stale fallback on release.
- Both triggers execute their existing target action.
- Inventory dragging and editable-field focus suppress world input; held inputs do not resume afterwards.
- A stick held before a campfire prompt opens cannot confirm it. A fresh gesture cancels without movement or confirms rest once without a second world action.
- Disabled campfire confirmation stays blocked; an informational Battle tip dismisses without movement.
- Held Battle triggers request exactly one step per press.

The main acceptance group and a focused prompt-safety completion check both returned empty error arrays. The only repeated main check corrected an exact floating-point comparison in the test: camera reprojection changed CSS positions by a fraction of a pixel while mouse targeting remained active. The check now permits a two-CSS-pixel projection tolerance.

Browser fixture setup declares the current development compatibility epoch, uses an isolated browser-fixture floor, and reveals its test area. The browser helper is retained in `rogues-dungeon/test/browser/gamepad-reticle-check.js` and the existing gamepad Playwright spec.

## Browser availability

- Desktop Edge connector: unavailable in current browser inventory; only IAB and MCP Apps were exposed.
- IAB: creation timed out waiting for its webview to attach. A subsequent tab inventory was empty, confirming no live verification tab was left behind.
- Physical gamepad: not tested. Inputs above were simulated through the browser Gamepad API.
- Wider browser-suite finalization remains with the integration workflow, as planned.

## Repository checks

- `node --import tsx --test rogues-dungeon/test/gamepad-input.test.ts`: 12 passed.
- `npm test`: 506 passed, 0 failed, no skipped/cancelled tests. Log: `output/mixed-input-npm-test.log`.
- `npm run typecheck`: passed after all implementation changes.
- `openspec validate add-mixed-input-controls --strict`: passed.
- Scoped `git diff --check`: passed.

## Requirement audit

| Requirement | Evidence |
| --- | --- |
| Independent movement and targeting | Pure controller ignores movement/face buttons; live left-stick and D-pad movement preserve mouse target |
| Direct aiming handoff and eight neighbors | Pure handoff/held-input tests and live eight-direction loop; renderer retains player-relative neighbor projection |
| Competing movement inputs | Pure held-map claims test; live keyboard overrides held controller input with no fallback |
| World prompt response | Revision/neutral/top-prompt policy tests; live held-stick, cancel, confirm, disabled and information-only cases |
| Trigger actions | Pure one-shot tests; live both triggers plus one-step Battle hold checks |
| Mouse panel boundary | Live inventory drag and editable focus checks, including held controls after release; no controller DOM panel actions |
| Interrupted input | Existing movement hook keeps focus/disconnect neutral gating; reset tests cover held aiming/triggers; exclusive UI transitions clear effective movement and travel |

No save epoch change, package/dependency change, commit, branch, server lifecycle change, or unrelated source reset was performed for this change. Existing dirty edits were retained. The agent-owned Edge test session is closed, the failed IAB attempt left no tab, and no verification CPU process remains running. Source work for this change is released.
