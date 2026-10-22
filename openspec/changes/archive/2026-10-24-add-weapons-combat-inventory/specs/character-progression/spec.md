# Spec Delta

## MODIFIED Requirements

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

