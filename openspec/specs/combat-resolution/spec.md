# combat-resolution Specification

## Purpose
Defines Cryptbound's deterministic combat-resource economy so tactical fights are readable, survivable, and configurable without random damage outcomes.

## Requirements

### Requirement: Apply Stamina to combat effectiveness
The player SHALL spend Stamina for attacks and recover Stamina from accepted ground movement, bounded by its maximum. Lower current Stamina SHALL lower effective Offense and Defense through a configurable deterministic curve.

#### Scenario: Recover Stamina while moving
- **WHEN** the player makes accepted ground moves while below maximum Stamina
- **THEN** each move restores the configured amount without exceeding the maximum

#### Scenario: Attack with depleted Stamina
- **WHEN** the player attacks after current Stamina has fallen
- **THEN** the attack spends the configured Stamina cost and uses the correspondingly lower effective Offense

### Requirement: Keep Health and Mana potion-driven
Health and Mana SHALL be restored only by their matching potions or explicit ability effects. Ordinary movement SHALL NOT restore Health or Mana, and accepted abilities SHALL spend their configured Mana cost.

#### Scenario: Walk while injured
- **WHEN** the player completes an accepted ground move with missing Health and Mana
- **THEN** Health and Mana remain unchanged while Stamina may recover

#### Scenario: Consume a Mana potion
- **WHEN** the player steps onto a Mana potion below maximum Mana
- **THEN** the potion restores the configured Mana amount without exceeding the maximum and is removed from the floor

### Requirement: Meet the floor-one encounter target
A newly created or post-death character SHALL begin with no equipped weapon and cannot make a melee attack until an attack-capable weapon is assigned. The nearby Wooden Stick SHALL grant `+1` Offense, remain weaker than every other attack-capable weapon, and enable deterministic melee after assignment.

#### Scenario: Evaluate the opening encounter
- **WHEN** a fresh character bumps an adjacent enemy before assigning an attack-capable weapon
- **THEN** no melee damage, Stamina cost, combat animation, world tick, or enemy phase occurs

#### Scenario: Arm with the starter weapon
- **WHEN** the player collects and assigns the nearby Wooden Stick
- **THEN** the character has `+1` Offense from that weapon and can make deterministic melee attacks

### Requirement: Differentiate Rat and Skeleton threats
The game SHALL use Rats as the approachable basic enemy and Skeletons as a tougher enemy type beginning on floor two. A same-floor Skeleton SHALL have greater Health and attack than a Rat.

#### Scenario: Floor-two enemy generation
- **WHEN** a floor-two enemy is generated as a Skeleton
- **THEN** it has greater Health and attack than a floor-two Rat

### Requirement: Resolve chance-based player melee combat
The game SHALL resolve a player melee attack with one percentile outcome using weapon HIT plus Luck and weapon CRIT. A CRIT occurs within the weapon CRIT range, a normal hit occurs within the remaining HIT range, and a MISS deals no target damage. A critical SHALL deal 150 percent of the final normal damage, rounded up.

#### Scenario: Miss an enemy
- **WHEN** the combat roll exceeds the weapon HIT value plus Luck
- **THEN** the enemy loses no Health and the result is a MISS

#### Scenario: Critically hit an enemy
- **WHEN** the combat roll falls within the weapon CRIT range
- **THEN** the enemy takes 150 percent of the final normal damage rounded up

### Requirement: Mitigate incoming damage by facing
The game SHALL calculate incoming damage using Stamina-scaled Defense at 100 percent from the player's front, 70 percent from either side, and 40 percent from the rear. Shields SHALL increase Defense for every direction, and the Two-Handed Sword SHALL automatically parry its defined attack outcome.

#### Scenario: Take a rear attack
- **WHEN** an enemy damages the player from behind the player's cardinal heading
- **THEN** the game applies 40 percent of the player's Stamina-scaled Defense
