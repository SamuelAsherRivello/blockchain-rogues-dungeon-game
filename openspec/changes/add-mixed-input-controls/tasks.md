# Tasks

## 1. Independent input ownership

- [x] 1.1 Implement direct right-stick targeting handoff without movement/face-button takeover; retain eight neighbors, triggers and drift guards; update targeting unit tests and control documentation and verify the focused Node tests pass.
- [x] 1.2 Arbitrate fresh keyboard/controller movement claims without cross-device vector summing or stale fallback; preserve keyboard combinations and bump timing; add ownership unit tests and verify them with the focused Node command.

## 2. World prompts and panel boundaries

- [x] 2.1 Add a visible, top-prompt-only right-stick response channel with neutral gating and consumed confirm/cancel gestures; retain existing movement responses, show a right-stick hint, and verify prompt/held-stick/disabled/hidden cases in focused tests.
- [x] 2.2 Suppress world actions during panel dragging, text focus and blocking dialogs, clearing queued travel and requiring fresh input after release; retain mouse-only panel operations; update help and verify gating through focused tests.

## 3. Integrated verification

- [x] 3.1 Extend the controller browser check with compatibility-safe fixtures for mixed movement/aiming, eight neighbors, triggers, world-prompt confirmation/cancellation and panel-drag suppression; run one focused Edge CLI group and check required desktop Edge/IAB contexts, recording any concrete availability limitations.
- [x] 3.2 Run npm test, npm run typecheck and scoped diff checks; audit requirements against evidence, record verification and release owned browsers/CPU work; reserve the full applicable browser suite for integration finalization.
