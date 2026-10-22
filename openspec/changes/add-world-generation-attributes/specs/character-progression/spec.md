# Spec Delta

## MODIFIED Requirements

### Requirement: Award experience and stat choices
Successful attacks, enemy defeats, discoveries, first opens of chests or crates, and a first arrival at a Dungeon Level SHALL award configured experience exactly once per qualifying event. Movement, waiting, and reused world objects SHALL not award experience. Each level threshold SHALL increase level by one through level 99, retain excess experience, and grant three unspent character Attribute Points. After the player confirms a character allocation for a gained level, the game SHALL automatically apply three deterministic world-attribute points without requiring player selection. Attribute Points SHALL persist until committed in Progression and SHALL not advance a tactical turn.

#### Scenario: Level up
- **WHEN** earned experience crosses a level threshold below level 99
- **THEN** level increases by one, excess experience remains toward the next threshold, and three character Attribute Points become available

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
- **WHEN** the player confirms a character allocation after gaining a level
- **THEN** three eligible world attributes increase deterministically and the player cannot choose those world changes

#### Scenario: Preview an allocation
- **WHEN** the player adjusts a draft allocation or closes Progression without confirmation
- **THEN** committed character attributes, world attributes, and Attribute Points remain unchanged
