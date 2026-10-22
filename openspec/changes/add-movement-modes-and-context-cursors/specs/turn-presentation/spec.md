# Spec delta

## MODIFIED Requirements

### Requirement: Present each resolved tactical turn within one second
The game SHALL use a one-second window to start visible enemy movement after each accepted action that advances time, without delaying logical turn resolution or later input. A moved enemy, pushable barrel, or future NPC SHALL travel from its displayed position to its committed grid destination over 250 milliseconds using a fast-start, slow-arrival easing curve. The player SHALL use 250 millisecond travel in Grid-tween, immediate placement in Grid-snap, and whole-pixel travel in General with Gridless selected. Battle SHALL enforce discrete grid steps and use Grid-tween for selected Gridless. A movement that starts within the window MAY finish after it. Floor triggers and doors remain in place and redraw their state.

#### Scenario: Player advances a turn
- **WHEN** an accepted action advances tactical time and changes the player position in Grid-tween
- **THEN** the game immediately commits the full logical result and starts the player's 250 millisecond positional movement without delaying later input

#### Scenario: Push a barrel
- **WHEN** an accepted cardinal move pushes a barrel into its next grid cell
- **THEN** the barrel starts a 250 millisecond positional movement and the player uses the effective movement presentation

#### Scenario: No visible enemy moves
- **WHEN** a resolved turn changes no visible enemy position
- **THEN** the game does not reserve or display a one-second delay before later input

#### Scenario: Grid-snap player
- **WHEN** an accepted player step occurs in Grid-snap
- **THEN** the player snaps while enemies and barrels retain their established playback

### Requirement: Retarget presentation during later actions
The game SHALL accept later actions while character movement is active. When a later accepted action changes a tweening character's committed destination, the renderer SHALL begin a new 250 millisecond movement from that character's current displayed position to its newest destination. Grid-snap player placement SHALL remain immediate; Gridless travel in General SHALL follow accepted precise positions. Battle input SHALL obey its one-press-per-step limit.

#### Scenario: Player acts during character travel
- **WHEN** the player submits an accepted action before the player's or an enemy's current movement tween ends
- **THEN** the action resolves immediately and every affected tweening character moves from its current displayed position toward its latest committed destination

#### Scenario: Rejected action during character travel
- **WHEN** a player action is rejected while character movement is active
- **THEN** the active movement continues unchanged
