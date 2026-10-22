# Spec delta

## Purpose

Provide a temporary tactical movement state near enemies while preserving the player's ordinary movement selection.

## ADDED Requirements

### Requirement: Separate game mode from selected movement mode
Game mode SHALL be General or Battle, independently of the selected Grid-snap, Grid-tween, or Gridless movement mode. General SHALL use the selected movement mode. Battle SHALL use Grid-snap for selected Grid-snap and Grid-tween for either selected Grid-tween or selected Gridless, without overwriting the selection.

#### Scenario: Enter Battle with each movement selection
- **WHEN** Battle activates
- **THEN** selected Grid-snap remains effective Grid-snap, selected Grid-tween remains effective Grid-tween, and selected Gridless becomes effective Grid-tween

#### Scenario: Return to General with Gridless selected
- **WHEN** Battle ends while Gridless is selected
- **THEN** Gridless becomes effective again without requiring the player to select it again

### Requirement: Override travel during Battle
While Battle is active, one mouse click or non-repeated directional keypress SHALL request at most one grid step. Held input, queued routes, and keyboard auto-repeat SHALL not continue travel. Existing legal movement and bump rules SHALL determine acceptance.

#### Scenario: Click a distant reachable cell in Battle
- **WHEN** the player clicks a destination several cells away
- **THEN** only the first legal route step is requested and another click is needed to continue

#### Scenario: Hold movement in Battle
- **WHEN** a movement key or mouse button remains held after its initial step
- **THEN** no further step occurs until a fresh press

### Requirement: Restore the selected movement behavior
Entering Battle SHALL retain the previously selected movement mode and cancel pending travel. Leaving Battle SHALL restore the selected mode without resuming a stale destination or held input.

#### Scenario: Leave Battle from Gridless
- **WHEN** Battle ends after temporarily overriding Gridless
- **THEN** Gridless becomes effective again and movement awaits fresh input

### Requirement: Center an off-grid player on Battle entry
When entering Battle from Gridless at an off-center position, the player SHALL tween to the center of the currently occupied cell without changing occupied cells, advancing time, charging a turn, or running an enemy phase for the alignment. Queued travel SHALL remain cancelled.

#### Scenario: Battle starts between centers
- **WHEN** Battle activates while the Gridless player is off-center
- **THEN** the player tweens to the occupied cell center
- **AND** the alignment itself adds no tactical time or enemy action

### Requirement: Indicate Battle on the game view
Battle SHALL display a red border exactly 2 CSS pixels thick around the main game view and an accessible Battle state label. General SHALL remove the border. The border SHALL not resize content or intercept input.

#### Scenario: Enter and leave Battle
- **WHEN** Battle activates and later ends
- **THEN** the border appears and disappears without changing the game-view dimensions, Zoom, or pointer hit targets

#### Scenario: Enter fullscreen
- **WHEN** Battle is active in fullscreen or either supported aspect
- **THEN** its border remains visible inside the main game view

### Requirement: Activate Battle independently of player detection
Battle SHALL be active if any living active-floor enemy is within its effective awareness range of the player, using the existing enemy-awareness distance rule. Walls, player Perception, line of sight, and whether that enemy is detected SHALL not prevent Battle. If no living enemy qualifies, game mode SHALL be General.

#### Scenario: Nearby enemy behind a wall
- **WHEN** a living enemy is within awareness range but a wall blocks player detection
- **THEN** game mode is Battle and its red border appears

#### Scenario: Low Perception does not prevent Battle
- **WHEN** Perception is 0 and an undetected living enemy is within awareness range
- **THEN** game mode is Battle

#### Scenario: All threats leave range or die
- **WHEN** no living enemy remains within its effective awareness range
- **THEN** game mode returns to General and the selected movement mode is restored
