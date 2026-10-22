# Spec delta

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

## ADDED Requirements

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

## Migration assumption

The design maps unused saved Vitality ranks and item modifiers to Perception while preserving explicit Perception when present. Very old Vitality-as-Health records retain their existing Health migration meaning.
