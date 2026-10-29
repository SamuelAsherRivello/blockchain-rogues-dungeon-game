# mixed-input-controls Specification

## Purpose

Allow players to combine mouse, keyboard, and controller inputs without one device taking unrelated controls away from another, while keeping world interactions distinct from panel management.

## Requirements

### Requirement: Independent movement and targeting
The game SHALL keep movement and targeting ownership independent. Keyboard, left-stick and D-pad movement SHALL preserve the current mouse target. Controller buttons used only for movement SHALL NOT hide or claim the reticle.

#### Scenario: Move with controller and aim with mouse
- **WHEN** the mouse targets a world cell and the player moves with the left stick or D-pad
- **THEN** mouse targeting remains active and character movement uses the normal movement and bump rules

### Requirement: Direct aiming handoff
Deliberate right-stick activity SHALL immediately claim targeting without a prior button press and select one of the eight adjacent cells relative to the character. Actual mouse movement SHALL reclaim free targeting. Neutral input, drift and unchanged held inputs SHALL NOT reclaim ownership. Controller targeting SHALL follow the character and never accumulate distance with time or intensity.

#### Scenario: Aim after mouse movement
- **WHEN** the player deliberately moves the right stick after mouse targeting
- **THEN** the reticle immediately selects the neighboring cell in that direction

#### Scenario: Mouse takes over a held stick
- **WHEN** the mouse moves while the right stick remains unchanged
- **THEN** mouse targeting persists until new deliberate right-stick activity

### Requirement: Resolve competing movement inputs
The most recent fresh movement input SHALL control movement without summing different devices or adding duplicate steps. Releasing its control SHALL NOT resume stale held movement from another device. Existing keyboard combinations within one device SHALL remain supported. A new physical press or stick direction change SHALL allow another handoff.

#### Scenario: Keyboard overrides held controller movement
- **WHEN** the controller holds east and the keyboard freshly requests north
- **THEN** movement follows the keyboard without adding eastward displacement, and releasing north does not resume the old eastward input

### Requirement: Right stick responds to world prompts
A visible in-world prompt SHALL receive fresh right-stick gestures before targeting. The existing affirmative direction SHALL confirm when enabled; other directions SHALL cancel. Informational prompts SHALL dismiss on a fresh gesture. Prompt gestures SHALL be consumed without an additional aim, movement or attack action. A held stick SHALL require neutral before responding to a newly opened or resolved prompt.

#### Scenario: Confirm campfire rest
- **WHEN** the stick was neutral after the campfire prompt appeared and a fresh gesture points toward its affirmative direction
- **THEN** the existing rest confirmation runs once without also moving or attacking

#### Scenario: Cancel without moving
- **WHEN** a fresh right-stick gesture points in another direction while a world prompt is active
- **THEN** the prompt closes and the character stays in place

#### Scenario: Do not confirm a hidden or disabled prompt
- **WHEN** a prompt is hidden or its affirmative action is disabled
- **THEN** it cannot execute that action through the right stick

### Requirement: Preserve trigger actions
Left and right triggers SHALL retain left-click and right-click world actions at the visible target. Each fresh press SHALL issue at most one click and follow existing path, trap, bump and Battle rules. Movement-only buttons SHALL not change targeting. A hidden stale target SHALL not receive clicks.

#### Scenario: Battle trigger press
- **WHEN** the player holds a trigger after aiming at an adjacent Battle target
- **THEN** at most one step or interaction is requested until a fresh trigger press

### Requirement: Mouse-operated panels suppress conflicting world input
Inventory, equipment and other panel management SHALL remain mouse-operated. An active panel drag, focused text field or blocking dialog SHALL suppress world movement, targeting and trigger actions. Merely showing information panels SHALL allow compatible gameplay input. Ending an exclusive interaction SHALL not resume stale keys, sticks, triggers or clicked travel.

#### Scenario: Drag inventory while controller is held
- **WHEN** the mouse starts dragging an inventory item while controller movement or aiming is held
- **THEN** world actions stop, the controller cannot manipulate panel contents, and ending the drag requires fresh world input

### Requirement: Clear interrupted input safely
Focus loss, controller disconnection and world transitions SHALL clear affected held input and queued travel without advancing tactical time. Inactive controller polling SHALL not publish repeated unchanged game state.

#### Scenario: Disconnect while moving
- **WHEN** the active controller disconnects
- **THEN** its movement stops and other devices remain usable without stale controller actions
