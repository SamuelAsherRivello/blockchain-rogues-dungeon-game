# Spec delta

## MODIFIED Requirements

### Requirement: Advance one tactical turn per accepted grid action
A legal discrete player step, actionable bump interaction, or explicit wait SHALL advance time by one turn and run the enemy phase, except that opening a lockbox is a zero-turn storage interaction. Gridless General travel SHALL use its column/row-center crossing rule instead. An accepted ability SHALL advance time and run its enemy phase once when presentation completes. A blocked exact mouse destination SHALL preserve any legal reachable-approach steps or adjacent interactions; no available step or interaction SHALL leave time unchanged. A successful cardinal barrel push SHALL count as an actionable bump interaction.

#### Scenario: Walk into traversable space
- **WHEN** the player makes one accepted grid move
- **THEN** the player moves one cell and the displayed time increases by one

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
- **WHEN** the player presses X or the mobile Wait button outside editable controls, Settings, a level-up choice, and a Lockbox window
- **THEN** the player stays in place, displayed time increases by one, and the normal enemy phase resolves once

#### Scenario: Complete an accepted ability
- **WHEN** Heal or Wand completes its presentation
- **THEN** its effect resolves, displayed time increases by one, and enemies act once

#### Scenario: Blocked terrain
- **WHEN** a requested next step enters impassable terrain with no actionable target
- **THEN** the step is rejected and time does not advance

#### Scenario: Commit equipment or ability assignment
- **WHEN** a valid equipment drag or ability reorder is committed outside a lockbox session
- **THEN** its change is applied before one time increment and one enemy phase

#### Scenario: Settings remains open
- **WHEN** no gameplay action is accepted while Settings is open
- **THEN** world Time and enemies remain unchanged through the ordinary action-driven time rule

#### Scenario: Unreachable mouse destination
- **WHEN** a selected destination has no exact route
- **THEN** any legal approach steps or adjacent interactions remain available under their normal time rules
- **AND** if neither is available, position and time remain unchanged and enemies do not act

#### Scenario: Open and use a lockbox
- **WHEN** the player bumps a lockbox, transfers items, and closes its window
- **THEN** the player stays outside its footprint and those storage interactions add no time increment or enemy phase

### Requirement: Interact through adjacent tiles
Bumping into an enemy, pickup, chest, campfire, stair, barrel, or lockbox SHALL invoke that target's interaction; stepping onto ground loot, stairs, or a floor trigger SHALL also resolve that tile interaction. Collecting an item or potion as part of an accepted move SHALL add no turn beyond that move's one turn. Bumping a campfire SHALL open its rest menu without advancing time; a confirmed rest SHALL resolve as one interaction turn. Bumping a lockbox SHALL open its paused storage window without advancing time or entering its blocked cell.

#### Scenario: Open a chest
- **WHEN** the player bumps an unopened adjacent chest
- **THEN** the chest opens and resolves its loot as one interaction turn

#### Scenario: Rest at a campfire
- **WHEN** the player confirms Rest after bumping an adjacent campfire
- **THEN** the player stays in place and time advances by exactly one while the normal enemy phase resolves once

#### Scenario: Push a barrel by bumping
- **WHEN** the player bumps a barrel with a legal cardinal push destination
- **THEN** the barrel push resolves as one interaction turn

#### Scenario: Activate a trigger by walking
- **WHEN** the player steps onto a floor trigger
- **THEN** its linked door updates to the active state during the accepted movement action

#### Scenario: Collect a discovery
- **WHEN** the player collects a valid discovery
- **THEN** the discovery is recorded and grants its specified experience once

#### Scenario: Collect while moving
- **WHEN** the player steps onto a collectible item or potion
- **THEN** the collection resolves during the accepted movement action and displayed time increases by exactly one

#### Scenario: Open storage by bumping
- **WHEN** the player bumps a reachable adjacent lockbox
- **THEN** its Lockbox window opens with gameplay paused and no movement into the lockbox cell
