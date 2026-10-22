# battle-mode-guidance Specification

## Purpose

Make a missing attack capability immediately understandable when Battle begins, without turning the guidance into a dismissible, one-time tutorial.

## Requirements

### Requirement: Advise an unarmed player after Battle settles
When Battle enters and its Battle presentation has settled to the persistent icon, the game SHALL show an in-world panel if no attack-capable weapon is assigned. The panel SHALL have title `Tip`, subject `Battle Mode`, and body `Assign a weapon, or you cannot fight.`

#### Scenario: Enter Battle without a weapon
- **WHEN** an unarmed player enters Battle and the Battle presentation finishes settling
- **THEN** the in-world Tip panel appears with the specified subject and body

#### Scenario: Re-enter Battle unarmed
- **WHEN** the player leaves Battle and later enters Battle again without assigning an attack-capable weapon
- **THEN** the Tip panel appears again after that entry presentation settles

#### Scenario: Enter Battle with a weapon
- **WHEN** a player with an attack-capable assigned weapon enters Battle
- **THEN** no missing-weapon Tip panel appears
