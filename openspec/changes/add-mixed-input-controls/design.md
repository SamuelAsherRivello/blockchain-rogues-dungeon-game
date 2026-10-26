# Design

## Context

Game currently puts keyboard keys and a `gamepad` entry into one held-movement map. Gridless sums that map, so different devices can accidentally combine. GamepadReticleController independently polls right-stick axes but all gamepad buttons currently switch its source and hide its target. MovementPromptController only dispatches movement responses; MovementPrompt subscribes even while visually hidden. Inventory pointer drag state is tracked separately from the world input gate. See proposal.md for motivation.

## Goals / Non-Goals

Goals: preserve compatible simultaneous controls; make conflicting actions deterministic; keep input policy in small pure helpers and adapters; preserve current world action timing and existing mouse panel behavior.

Non-goals: controller panel focus/navigation, ability bindings, remapping screens, additional packages, save migration, renderer restructuring, and unrelated shared-file edits.

## Decisions

1. **Independent targeting controller.** Update GamepadReticleController so right-stick intent, not movement/face buttons, claims aiming. Triggers keep their click event and hide the acted-on target. A held stick cannot undo a later mouse movement on the next poll. Retain the radial dead zone and eight-sector neighbor projection. Removing the all-button gate follows the user's confirmed answer.
2. **Movement claims clear incompatible held entries.** Keep physical keyboard-held state separate from effective movement entries. On a fresh keyboard movement claim, drop the gamepad entry; on a fresh controller direction claim, drop effective keyboard entries. Key-repeat events and releasing an inactive source cannot revive it. Preserve same-keyboard Gridless diagonals. This is smaller than replacing the simulation or adding a global device mode.
3. **Separate prompt response channel.** Add a dedicated right-stick subscription/response path and a prompt revision token to MovementPromptController. Visible prompts register for it; process the newest visible prompt only. MovementPrompt retains existing keyboard/movement semantics, while right-stick responses always consume the gesture. Use its current affirmative direction, dominant-axis mapping for diagonal stick gestures, and other directions for cancel. Disabled/confirming prompts consume without confirming. New prompt contexts require neutral, including when a held direction was used to open the prompt. Resolution requires neutral before ordinary aiming can resume. Renderer input adapts to the shared controller without sending synthetic DOM events or movement actions.
4. **Exclusive panel interactions gate world input.** Extend Game's existing world input gate with drag state. Cancel pending movement/targets when the gate closes; keyboard release and controller neutral tracking keep blocked gestures from reappearing after drag completion. Text focus and visibility guards cover all world input, not only controller polling. Do not synthesize clicks on DOM panels.
5. **Verification stays bounded.** Extend gamepad-input.test.ts with pure ownership, prompt, dead-zone, held-input and gating cases. Use one focused Edge CLI verification group after implementation, with the current compatibility epoch and supported fixture helpers, covering mixed movement/aiming, prompts, drag suppression, triggers and eight neighbors. Run npm test and typecheck; check desktop Edge and IAB rendering per project instructions and record concrete capability limitations. No browser runs during proposal. Broader browser finalization belongs to the integration coordinator.

## Risks / Trade-offs

- Prompt registration churn could reset input every render. Use stable subscriber identities and advance revisions only when prompt membership/context changes.
- Held inputs could act after a dialog closes. Require neutral/release and clear queued travel rather than resuming the old owner.
- Multiple open prompts could all resolve from one gesture. Only the top visible prompt receives it.
- Shared Game/renderer files contain other active work. Make bounded edits, reread before patching, and retain existing performance, save, fog and animation behavior.

## Migration Plan

No persisted input settings or save format changes. Deploy as ordinary application code; reverting the scoped input changes restores prior behavior without altering saves. No unresolved behavior choices remain: direct right-stick takeover was confirmed, and prompt directional mapping preserves the existing prompt contract.
