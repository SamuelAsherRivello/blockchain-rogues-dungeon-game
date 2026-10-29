# Proposal

## Why

Players need to move with a controller while aiming with a mouse, or combine keyboard movement with controller targeting. The current gamepad buttons claim and hide the reticle even when used only for movement; right-stick gestures also lack a dedicated path for world prompts.

## What Changes

- Separate movement ownership from targeting ownership. Left stick/D-pad movement and keyboard input never steal mouse targeting.
- Let deliberate right-stick activity immediately select one of the eight neighboring tiles, without requiring a gamepad button. Actual mouse movement restores free targeting. Ignore drift and unchanged held inputs when deciding ownership.
- Resolve competing movement inputs without summing devices, duplicate Battle steps, or resuming stale held input after a handoff.
- Route fresh right-stick gestures to visible in-world prompts first, using their existing confirm direction and cancel behavior. Consume the gesture so it cannot also aim, move, or attack.
- Keep inventory/panel management with the mouse; pause conflicting world input during active panel dragging, text entry, or blocking dialogs, with fresh input required afterwards.
- Preserve trigger left/right click actions, existing bump interactions and tactical rules. Movement buttons do not hide a mouse-controlled reticle; trigger actions can hide their target after clicking.

## Capabilities

### New Capabilities

- `mixed-input-controls`: Independent movement/targeting ownership, context-sensitive world prompt input, and boundaries around mouse-operated panels.

### Modified Capabilities

None. Existing movement, mouse routing, and campfire requirements remain intact; this adds input-device arbitration and a separate prompt response path.

## Impact

Touches game input helpers, Game's movement/drag gating, the renderer's targeting adapter, MovementPromptController/MovementPrompt, help text, and focused tests. No new packages, renderer changes, save-format changes, panel navigation, or Git workflow changes. Playwright adds useful evidence for real event ordering, mixed-device use, prompt consumption, and drag suppression; run a focused Edge check after implementation and reserve wider browser coverage for finalization. Existing shared-file edits and orchestration scheduling must be preserved.

The user confirmed direct right-stick takeover on 2026-10-26. Prompt direction mapping follows the existing world prompt's affirmative direction; other directions cancel. This proposal does not introduce gamepad inventory navigation or new ability bindings.
