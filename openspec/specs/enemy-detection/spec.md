# enemy-detection Specification

## Purpose

Define how player Perception determines automatic line-of-sight enemy detection independently of enemy awareness and Battle mode.

## Requirements

### Requirement: Scale enemy detection with Perception
Automatic enemy detection SHALL require both clear line of sight and range within two grid cells per positive Perception point. Perception SHALL support integer values 0 through 99 while initial tuning focuses on 0 through 5. The initial zero-value tuning SHALL use a one-cell minimum range so very close enemies can still be detected.

#### Scenario: Perception four
- **WHEN** Perception is 4 and an enemy has clear line of sight
- **THEN** the enemy is detected at a distance of 8 cells and is not detected beyond 8 cells

#### Scenario: Perception five
- **WHEN** Perception is 5 and an enemy has clear line of sight
- **THEN** the enemy is detected at a distance of 10 cells and is not detected beyond 10 cells

#### Scenario: Perception zero
- **WHEN** Perception is 0 and an enemy is adjacent with clear line of sight
- **THEN** the enemy is detected under the one-cell minimum tuning assumption
- **AND** an enemy two cells away is not detected

#### Scenario: Values above the initial balance range
- **WHEN** Perception is 99
- **THEN** its range is 198 cells before line-of-sight and floor bounds apply, without a hard cap at Perception 5

### Requirement: Block enemy detection through opaque obstacles
Walls and closed doors SHALL block automatic enemy detection regardless of Perception. Open doors SHALL allow line of sight. Detection SHALL support diagonal as well as cardinal sight lines and SHALL not see through a pinched corner between touching opaque cells.

#### Scenario: High Perception behind a wall
- **WHEN** an enemy is within detection range but a wall blocks line of sight
- **THEN** the player does not automatically detect it

#### Scenario: Door opens
- **WHEN** a closed door was the only sight blocker and opens while the enemy remains within range
- **THEN** automatic detection updates to reveal that enemy

### Requirement: Keep player detection independent of Battle
Perception and detected-enemy state SHALL NOT alter Battle activation or enemy awareness. A nearby undetected enemy SHALL still trigger Battle if within awareness range. A detected enemy beyond its awareness range SHALL not trigger Battle solely because the player detected it.

#### Scenario: Undetected enemy triggers Battle
- **WHEN** low Perception or a wall prevents detection of an enemy within its awareness range
- **THEN** Battle and its red border activate without revealing that enemy through the detection rule

#### Scenario: Detect an enemy before Battle
- **WHEN** Perception detects an enemy outside that enemy's awareness range and no other enemy qualifies
- **THEN** game mode remains General

### Requirement: Reevaluate enemy detection after relevant changes
Automatic detection SHALL update when player or enemy positions, effective Perception, sight blockers, or the active floor change. Detected-enemy presentation SHALL remain separate from authoritative enemy simulation and SHALL not introduce terrain fog-of-war.

#### Scenario: Increase Perception
- **WHEN** confirmed progression raises Perception enough to include an enemy with clear line of sight
- **THEN** detection updates without requiring a movement turn

### Requirement: Hide enemies until perceived
An enemy SHALL expose a sprite, shadow, minimap marker, tooltip, silhouette, or identifying combat cursor only while it currently satisfies both Perception range and line of sight. Losing either condition SHALL hide all such presentation again, including stale hover disclosures. Detection SHALL NOT retain a persistent reveal or last-known marker. The enemy SHALL remain active for collision, enemy actions, and awareness-based Battle activation. Hidden presentation SHALL not remove the authoritative enemy from the floor.

#### Scenario: Enemy appears in the viewport before detection
- **WHEN** an enemy is inside the visible screen area but has not been perceived
- **THEN** its sprite and shadow remain hidden and its location is not revealed by a minimap marker, tooltip, silhouette, or identifying cursor

#### Scenario: Hidden enemy triggers Battle
- **WHEN** an undetected enemy qualifies under its awareness range
- **THEN** it can act and trigger Battle while its identifying presentation remains hidden

#### Scenario: Previously detected enemy leaves range
- **WHEN** a detected enemy moves outside current Perception range while line of sight remains clear
- **THEN** all identifying presentation hides again without a last-known marker
- **AND** collision, enemy actions, and awareness-based Battle evaluation continue

#### Scenario: Previously detected enemy loses line of sight
- **WHEN** a detected enemy remains within Perception range but a wall or closed door blocks line of sight
- **THEN** all identifying presentation hides again, including any open tooltip or identifying cursor
- **AND** the loss of player detection alone does not end Battle

#### Scenario: Reacquire a hidden enemy
- **WHEN** a previously detected enemy again satisfies both current Perception range and line of sight
- **THEN** its detected presentation becomes available again without a separate discovery action
