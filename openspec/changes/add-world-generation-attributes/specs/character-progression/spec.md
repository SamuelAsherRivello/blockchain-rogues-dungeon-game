# Spec Delta

## MODIFIED Requirements

Planning blocker: reconcile the intended three world points per earned level
with the lifetime world-attribute cap before applying this delta.

### Requirement: Award experience and stat choices
Successful attacks, enemy defeats, discoveries, first opens of chests or crates, and a first arrival at a Dungeon Level SHALL award configured experience exactly once per qualifying event. Movement, waiting, and reused world objects SHALL not award experience. Each level threshold SHALL increase level by one through level 99, retain excess experience, and grant three unspent character Attribute Points with one pending world event. After all three character points for that earned award are spent, its deterministic world update SHALL apply once. Attribute Points SHALL persist until committed in Progression and SHALL not advance a tactical turn. Lifetime world-cap behavior remains blocked on the documented decision.

#### Scenario: Level up
- **WHEN** earned experience crosses a level threshold below level 99
- **THEN** level increases by one, excess experience remains toward the next threshold, three character Attribute Points become available, and the player sees the new level and point count

#### Scenario: Award a one-time world reward
- **WHEN** the player opens a particular chest or crate, records a discovery, or first arrives at a Dungeon Level
- **THEN** that source grants its configured experience once and cannot grant it again from reuse

#### Scenario: Attack an enemy
- **WHEN** the player successfully attacks an enemy
- **THEN** the attack grants its configured experience and the normal tactical turn resolves once

#### Scenario: Spend Attribute Points
- **WHEN** the player confirms a valid character Progression allocation
- **THEN** each selected character attribute increases by its confirmed amount, the matching number of character Attribute Points is spent, and displayed time does not advance

#### Scenario: Apply automatic world points
- **WHEN** confirmed character spending completes an earned level's three-point award
- **THEN** three eligible world attributes increase deterministically and the player cannot choose those world changes

#### Scenario: Confirm only part of an award
- **WHEN** the player spends one point from a three-point award
- **THEN** the other two points and world update remain pending until that award is completed

#### Scenario: Avoid duplicate growth
- **WHEN** an already completed award's result is reopened or acknowledged after reload
- **THEN** neither character points nor world points apply again

#### Scenario: Preview an allocation
- **WHEN** the player adjusts a draft allocation or closes Progression without confirmation
- **THEN** committed character attributes, world attributes, and Attribute Points remain unchanged, and the dialog shows only aggregate pending gameplay benefits for attributes with draft points

### Requirement: Create a balanced starting character
An empty Saved Game SHALL require a character roll before Create World. Each roll SHALL distribute exactly 30 points across the ten character attributes, with every character attribute from 1 through 5. The player SHALL be able to reroll without limit and confirm only a rolled sheet. Character confirmation SHALL retain that draft until final world confirmation begins the campaign.

#### Scenario: Reroll a character sheet
- **WHEN** the player selects Roll again
- **THEN** all ten displayed attributes form a new valid 30-point sheet without changing the Saved Game

#### Scenario: Confirm a character sheet
- **WHEN** the player confirms a rolled sheet
- **THEN** Create World opens with that character draft retained and no campaign or Attribute Points committed before final world confirmation
