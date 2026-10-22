# character-progression Specification

## Purpose

Defines how a character grows across repeated dungeon runs and equips found gear, so defeat resets a run while preserving earned long-term progress.

## Requirements

### Requirement: Track six persistent character stats
The character SHALL retain ten persistent attributes: Health, Stamina, Offense, Defense, Mana, Perception, Strength, Luck, Recovery, and Stealth. Perception SHALL be an integer from 0 through 99; other attributes SHALL remain integers from 1 through 99. Health, Stamina, Offense, Defense, and Mana SHALL define their matching Status capacity; the other attributes retain their defined deterministic effects. Perception SHALL determine line-of-sight enemy detection independently of Battle. Defense SHALL derive chiefly from equipped armor and shields while retaining its attribute contribution.

#### Scenario: Apply stat effects
- **WHEN** a character attribute is used during play
- **THEN** its deterministic effect applies under the selected movement mode's tactical time rule without adding time solely for detection

#### Scenario: Display Attributes
- **WHEN** the player equips or removes armor or a shield
- **THEN** effective Defense changes chiefly through the equipped item while retaining its attribute contribution

#### Scenario: Reach an attribute cap
- **WHEN** the player attempts to increase an attribute already at 99
- **THEN** that attribute remains 99 and the Attribute Point is not spent

#### Scenario: Replace unused Vitality
- **WHEN** Attributes or Progression is displayed
- **THEN** Perception replaces Vitality and exactly ten attributes remain

#### Scenario: Perception zero is valid
- **WHEN** a character has Perception 0
- **THEN** normalization preserves 0 and the documented close-range detection rule applies

### Requirement: Award experience and stat choices
Successful attacks, enemy defeats, discoveries, first opens of chests or crates, and a first arrival at a Dungeon Level SHALL award configured experience exactly once per qualifying event. Movement, waiting, and reused world objects SHALL not award experience. Each level threshold SHALL increase level by one through level 99, retain excess experience, and grant three unspent character Attribute Points with one pending world event. After all three character points for that earned award are spent, its deterministic world update SHALL apply once. Attribute Points SHALL persist until committed in Progression and SHALL not advance a tactical turn. World awards distribute three points with replacement among values below 99; complete saturation reports unused points.

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
- **THEN** three points are distributed deterministically among up to three world attributes below 99 and the player cannot choose those changes

#### Scenario: Confirm only part of an award
- **WHEN** the player spends one point from a three-point award
- **THEN** the other two points and world update remain pending until that award is completed

#### Scenario: Avoid duplicate growth
- **WHEN** an already completed award's result is reopened or acknowledged after reload
- **THEN** neither character points nor world points apply again

#### Scenario: Preview an allocation
- **WHEN** the player adjusts a draft allocation or closes Progression without confirmation
- **THEN** committed character attributes, world attributes, and Attribute Points remain unchanged, and the dialog shows only aggregate pending gameplay benefits for attributes with draft points

### Requirement: Equip five gear slots
The character SHALL have two Weapons positions and two Armor positions. Items SHALL enter Inventory before manual compatible equip. Equipment SHALL use only Offense, Defense, and Mana modifiers and never have durability or a Mana cost. A two-slot item SHALL occupy both positions in its compatible group. Only enabled equipment SHALL modify attributes. The system SHALL not auto-equip or prompt to replace gear.

#### Scenario: Auto-equip into empty slot
- **WHEN** the player collects compatible gear while a position is empty
- **THEN** the gear enters Inventory and that position stays empty until a drag is committed

#### Scenario: Decide on occupied slot
- **WHEN** the player finds gear while matching positions are occupied
- **THEN** it enters Inventory if capacity is available, without a swap/leave prompt

#### Scenario: Equip a two-slot item
- **WHEN** a player equips a Two-Handed Sword into an empty Weapons group
- **THEN** both Weapons positions become occupied by that item and its modifiers apply once

### Requirement: Begin each run with empty gear
Starting a fresh run SHALL clear run Inventory and equipped gear while retaining persistent attributes, level, unspent Attribute Points, XP count, partial XP, and ability bindings. The initial nearby stick SHALL be available to collect into Inventory before manual equipment.

#### Scenario: New run equipment
- **WHEN** a fresh run starts after death
- **THEN** Weapons and Armor positions and Inventory are empty while persistent progression remains

### Requirement: Preserve progression on death
At zero Health, the campaign's death-recovery mode SHALL determine the outcome. Classic SHALL end and clear the campaign. Adventure SHALL retain persistent attributes, level, unspent Attribute Points, XP count, partial XP, ability bindings, and hidden Difficulty while restoring the current Dungeon Level's entry state with run Inventory, equipment, current resources, Time, counters, and discoveries reset. Journey SHALL restore its newest checkpoint. Difficulty SHALL not be shown in the player-facing interface.

#### Scenario: Adventure death retains character growth
- **WHEN** an Adventure character dies
- **THEN** restarting the level retains persistent progression and begins with reset run possessions, resources, time, counters, and discoveries

#### Scenario: Death starts a fresh Level 1
- **WHEN** an Adventure character dies on Dungeon Level 1
- **THEN** the level restarts from its Level 1 entry state with Time at zero, empty run equipment and Inventory, and starting run counters/resources while character progression and hidden Difficulty remain

#### Scenario: Death advances deterministic run identity
- **WHEN** an Adventure character dies in a Saved Game
- **THEN** its current Dungeon Level restarts from the same deterministic entry identity rather than creating a different run

#### Scenario: Death starts fresh floor
- **WHEN** an Adventure character dies
- **THEN** the current dungeon level restarts from its entry state with empty gear while persistent progression remains intact

#### Scenario: Journey death restores the checkpoint
- **WHEN** a Journey character dies with a valid checkpoint
- **THEN** it resumes from that checkpoint rather than applying the Adventure reset

#### Scenario: Classic death ends the campaign
- **WHEN** a Classic character dies
- **THEN** no fresh playable run starts from that campaign

### Requirement: Celebrate a level gain
Crossing a level threshold SHALL present sparkles converging on the player from surrounding directions, merge them on the player, and play the documented level-gain chime once after the merge. The celebration SHALL not stop the world or require an immediate allocation.

#### Scenario: Gain a level during play
- **WHEN** an XP award increases the character level
- **THEN** sparkles arrive from surrounding directions, merge on the character, and the level-gain chime plays once after the convergence

### Requirement: Summarize pending attribute benefits
Progression SHALL show the remaining allocation count in the form `Spend N of 3 attribute points.` above the attribute controls. The Progression window title SHALL be `Level Up — Character`. Below the attribute controls, Progression SHALL show an `Earned Results` heading and a borderless results field that is always three lines tall. The results field SHALL remain empty until points are drafted, SHALL show only attributes with pending points as body-text bullets, and SHALL combine all pending points for one attribute into one plain-language total-effect line. Health SHALL be expressed as the projected percentage increase in maximum Health. Strength and Stealth SHALL use an explicit placeholder such as `No gameplay effect yet.` while their effects remain unimplemented.

#### Scenario: Show no pending benefits
- **WHEN** Progression opens with no draft allocation
- **THEN** the window title reads `Level Up — Character`, the allocation count reads `Spend 3 of 3 attribute points.`, the `Earned Results` heading is present, and the three-line results field is empty

#### Scenario: Aggregate one attribute
- **WHEN** the player assigns multiple pending points to one attribute
- **THEN** the results field shows one bullet for that attribute containing the combined pending gameplay effect rather than one bullet per point

#### Scenario: Show only affected attributes
- **WHEN** the player assigns points to some but not all attributes
- **THEN** the results field contains no bullets for attributes without pending points

#### Scenario: Preview an unimplemented effect
- **WHEN** the player assigns pending points to Strength or Stealth
- **THEN** the corresponding result bullet explicitly states that the gameplay effect is not implemented yet

### Requirement: Prompt for unspent Attribute Points
When Attribute Points are unspent, Attributes SHALL present a panel-local `LEVEL UP` callout with the available point count and an `Open Progression` action. The callout SHALL not pause the world or be dismissible. Opening Progression SHALL show a full-game dialog that may close without committing a draft; the callout SHALL remain until no Attribute Points remain.

#### Scenario: Defer allocation
- **WHEN** the character gains Attribute Points and continues to act
- **THEN** the Attributes callout remains available while ordinary gameplay continues

#### Scenario: Close without spending
- **WHEN** the player closes Progression without confirmation
- **THEN** all committed values remain unchanged and the Attributes callout remains

#### Scenario: Spend only some points
- **WHEN** the player confirms an allocation that leaves Attribute Points unspent
- **THEN** the callout remains and shows the reduced available-point count

### Requirement: Create a balanced starting character
An empty Saved Game SHALL require a character roll before Create World. Each roll SHALL distribute exactly 30 points across the ten character attributes, with every character attribute from 1 through 5. The player SHALL be able to reroll without limit and confirm only a rolled sheet. Character confirmation SHALL retain that draft until final world confirmation begins the campaign.

#### Scenario: Reroll a character sheet
- **WHEN** the player selects Roll again
- **THEN** all ten displayed attributes form a new valid 30-point sheet without changing the Saved Game

#### Scenario: Confirm a character sheet
- **WHEN** the player confirms a rolled sheet
- **THEN** Create World opens with that character draft retained and no campaign or Attribute Points committed before final world confirmation

### Requirement: Preserve progression when replacing Vitality
Replacing Vitality with Perception SHALL preserve other attributes, level, XP, unspent Attribute Points, and saved run state. Migration SHALL accept legacy Vitality data without resetting the character. The character roll SHALL retain its existing ten-attribute 30-point budget and 1-through-5 roll bounds, with Perception replacing Vitality in the roll.

#### Scenario: Migrate a legacy character
- **WHEN** a saved character contains Vitality and lacks Perception
- **THEN** migration preserves character progress and supplies a valid Perception value using the documented migration policy

#### Scenario: Prefer explicit Perception
- **WHEN** a saved character contains valid Perception as well as legacy Vitality
- **THEN** the explicit Perception value is retained

#### Scenario: Roll the updated attributes
- **WHEN** the player rolls a new character
- **THEN** exactly ten attributes including Perception total 30 points, each within the existing initial roll bounds
