# Spec delta

## MODIFIED Requirements

### Requirement: Advance one tactical turn per accepted grid action
A legal discrete player step, actionable bump interaction, or explicit wait SHALL advance time by one turn and run the enemy phase. Gridless General travel SHALL use its column/row-center crossing rule instead. An accepted ability SHALL advance time and run its enemy phase once when presentation completes. A blocked exact mouse destination SHALL preserve any legal reachable-approach steps or adjacent interactions; no available step or interaction SHALL leave time unchanged. A successful cardinal barrel push SHALL count as an actionable bump interaction.

#### Scenario: Walk into traversable space
- **WHEN** the player makes one accepted discrete grid move
- **THEN** the player moves one cell and displayed time increases by one

#### Scenario: Bump an enemy
- **WHEN** the player bumps an adjacent enemy
- **THEN** one attack action resolves and time advances once

#### Scenario: Push a barrel
- **WHEN** the player bumps a barrel from a cardinal direction and the cell one tile beyond it is walkable and unoccupied
- **THEN** the player moves into the barrel's previous cell, the barrel moves one cell in the same direction, and time advances once

#### Scenario: Reject a blocked barrel push
- **WHEN** the player bumps a barrel whose destination is blocked or occupied
- **THEN** neither the player nor barrel moves and time does not advance

#### Scenario: Wait in place
- **WHEN** the player presses X or the mobile Wait button outside editable controls, Settings, and a level-up choice
- **THEN** the player stays in place, displayed time increases by one, and the normal enemy phase resolves once

#### Scenario: Complete an accepted ability
- **WHEN** Heal or Wand completes its presentation
- **THEN** its effect resolves, displayed time increases by one, and enemies act once

#### Scenario: Blocked terrain
- **WHEN** a requested next step enters impassable terrain with no actionable target
- **THEN** the step is rejected and time does not advance

#### Scenario: Commit equipment or ability assignment
- **WHEN** a valid equipment drag or ability reorder is committed
- **THEN** its change is applied before one time increment and one enemy phase

#### Scenario: Settings remains open
- **WHEN** no gameplay action is accepted while Settings is open
- **THEN** world Time and enemies remain unchanged through the ordinary action-driven time rule

#### Scenario: Unreachable mouse destination
- **WHEN** a selected destination has no exact route
- **THEN** any legal approach steps or adjacent interactions remain available under their normal time rules
- **AND** if neither is available, position and time remain unchanged and enemies do not act

## ADDED Requirements

### Requirement: Apply mode-specific movement time accounting
Discrete Grid-snap, Grid-tween, and Battle movement SHALL retain one turn per accepted grid step or actionable bump. Gridless travel in General SHALL instead advance time per crossed column-center and row-center line. Each resulting turn SHALL evaluate enemies under their existing cooldown rules. Visual interpolation and ordinary occupied-cell updates SHALL not independently add turns.

#### Scenario: Compare diagonal movement states
- **WHEN** a discrete legal diagonal grid step is accepted
- **THEN** it costs one turn
- **AND** Gridless travel crossing both center-line axes costs two turns instead

#### Scenario: Battle overrides free travel
- **WHEN** a Gridless player makes a legal discrete step in Battle
- **THEN** only the ordinary discrete action charge applies and no extra center-line travel charge is added

### Requirement: Keep mouse courtesy stops free of extra turns
The 30-step mouse limit, route preview, pre-trap courtesy pause, and second-click confirmation alone SHALL NOT advance tactical time or run an enemy phase. Accepted travel before or through a confirmed trap SHALL retain the selected movement mode's ordinary step or center-line accounting and trap damage rules. Stopping SHALL not charge untraveled route steps.

#### Scenario: Pause before a trap
- **WHEN** a mouse route reaches the safe cell center before an unconfirmed trap
- **THEN** only the accepted travel to that center is charged and waiting for another click adds no turn

#### Scenario: Confirm a trap crossing
- **WHEN** a fresh click permits entry into the adjacent warned trap
- **THEN** only accepted movement and its normal trap effects advance gameplay, with no extra confirmation turn

## Baseline authority and approved extension

The current complete/approach route and adjacent interaction behavior is the user-selected baseline. Exact target reachability alone does not determine whether movement is requested.
