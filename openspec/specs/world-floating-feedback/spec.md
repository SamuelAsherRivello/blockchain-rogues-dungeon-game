# world-floating-feedback Specification

## Purpose

Defines brief, readable combat and healing feedback that appears at the affected character's location in the dungeon world. The feedback communicates health changes without adding persistent world-space status UI.

## Requirements

### Requirement: Show floating text for player Health changes
When the player's Health changes, the game SHALL show brief floating text at the player's world position; gains SHALL be green and losses SHALL be red.

#### Scenario: Player takes damage
- **WHEN** an enemy reduces the player's Health
- **THEN** red floating text showing the amount lost appears at the player's position

#### Scenario: Player gains Health
- **WHEN** the player's Health increases
- **THEN** green floating text showing the amount gained appears at the player's position

### Requirement: Show floating text for enemy damage
When an enemy loses health, the game SHALL show brief red floating text at that enemy's world position showing the amount of damage dealt.

#### Scenario: Enemy is hit by a melee attack
- **WHEN** the player damages an enemy with a melee attack
- **THEN** red floating text showing the damage appears at the enemy's position

#### Scenario: Enemy is hit by an ability
- **WHEN** an ability damages an enemy
- **THEN** red floating text showing the damage appears at the enemy's position

### Requirement: Keep floating feedback transient and text-only
Floating health feedback and damage particles SHALL disappear after their brief animations and SHALL NOT render world-space health bars or persistent health indicators.

#### Scenario: Feedback expires
- **WHEN** a floating-text or damage-particle animation completes
- **THEN** its feedback is removed from the world view

#### Scenario: Enemy remains visible
- **WHEN** an enemy is damaged
- **THEN** the world view shows its transient damage feedback without a health bar

### Requirement: Show a damage-particle burst for any damaged character
When combat damage reduces a player or enemy's Health, the game SHALL show four transient particles centered on that character. Each particle SHALL begin at 25 percent of one grid tile, move a random radial direction by one-half grid tile during 250 milliseconds, and fade from transparent to opaque at its midpoint and back to transparent at its end.

#### Scenario: Player takes damage
- **WHEN** an enemy attack reduces the player's Health
- **THEN** four damage particles appear at the player's position and expire after 250 milliseconds

#### Scenario: Enemy takes melee damage
- **WHEN** the player damages an enemy with a melee attack
- **THEN** four damage particles appear at that enemy's position and expire after 250 milliseconds

#### Scenario: Enemy takes ability damage
- **WHEN** an ability damages an enemy
- **THEN** four damage particles appear at that enemy's position and expire after 250 milliseconds

#### Scenario: A destructible object is destroyed
- **WHEN** a destructible object is destroyed
- **THEN** four damage particles appear at that object's position and expire after 250 milliseconds

### Requirement: Label exceptional player attack outcomes
The world feedback SHALL show normal player damage as a number, critical player damage as `CRIT <damage>`, and a failed player attack as `MISS`. A MISS SHALL show at the enemy position and shall not show a damage number.

#### Scenario: Show a critical hit
- **WHEN** a player attack critically damages an enemy for 12
- **THEN** the enemy position displays `CRIT 12`

#### Scenario: Show a miss
- **WHEN** a player attack misses an enemy
- **THEN** the enemy position displays `MISS` and no damage number

### Requirement: Distinguish incoming attack directions
The player damage feedback SHALL visually distinguish north, south, east, and west incoming attacks while remaining transient and text-only.

#### Scenario: Show a north attack
- **WHEN** an enemy damages the player from north
- **THEN** the player feedback uses the north-specific directional treatment
