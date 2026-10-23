# Spec Delta

## Purpose

Make automatic Battle Mode unmistakable while preserving a calm tactical stance during frequent encounters. The presentation communicates movement-state changes with spatial focus while preserving Perception-based enemy identification.

## ADDED Requirements

### Requirement: Present Battle entry and persistence
The main game view SHALL show a large crossed-swords Battle Mode banner entering from the left on each General-to-Battle transition, then retract the text while retaining a rounded square crossed-swords icon in the upper-left for the full Battle state.

#### Scenario: Enter Battle
- **WHEN** a qualifying enemy causes the game mode to change from General to Battle
- **THEN** the crossed-swords icon and Battle Mode banner enter from the left
- **AND** the text retracts after the entry presentation while the icon remains visible

#### Scenario: Additional enemy joins Battle
- **WHEN** another qualifying enemy appears while the game is already in Battle
- **THEN** the existing icon remains stable
- **AND** the full entry banner does not replay

#### Scenario: Leave Battle
- **WHEN** no living enemy remains within Battle awareness range
- **THEN** the persistent Battle icon leaves the game view
- **AND** no full exit banner is required

### Requirement: Keep Battle presentation independent of Perception styling
Battle SHALL use the same banner, icon, and transition treatment for every player Perception value; Perception SHALL affect awareness and enemy detection distance, not the visual form of Battle Mode.

#### Scenario: Low Perception enters Battle
- **WHEN** Battle starts for a player with low Perception
- **THEN** the Battle presentation uses the same visual treatment as higher Perception

#### Scenario: High Perception enters Battle
- **WHEN** Battle starts for a player with high Perception
- **THEN** the Battle presentation uses the same visual treatment while more qualifying enemies may be detected

### Requirement: Provide developer-selectable Battle visual variants
Developer settings SHALL expose `E-VIS` with variant values `1` and `2`. Variant 1 SHALL brighten the tactical area while leaving surrounding cells at normal brightness. Variant 2 SHALL preserve normal tactical-area brightness while darkening cells outside the tactical area.

#### Scenario: Select Battle visual variant one
- **WHEN** a developer selects `E-VIS: 1` and enters Battle
- **THEN** the tactical area is brighter than its surrounding cells

#### Scenario: Select Battle visual variant two
- **WHEN** a developer selects `E-VIS: 2` and enters Battle
- **THEN** the tactical area remains at normal brightness
- **AND** cells outside it are darker

### Requirement: Transition music with Battle state
General Mode SHALL play Spooky Dungeon, and Battle Mode SHALL play JRPG - End Dungeon with a 0.5-second crossfade on entry and exit. The outgoing track SHALL pause after fading out, and each track SHALL retain its playback position for its next activation. Existing mute and volume controls SHALL govern both tracks throughout fades.

#### Scenario: Enter Battle music
- **WHEN** the game changes from General to Battle
- **THEN** the normal track crossfades to the action-oriented track over 0.5 seconds

#### Scenario: Leave Battle music
- **WHEN** the game changes from Battle to General
- **THEN** the action-oriented track crossfades to the existing General track position over 0.5 seconds

### Requirement: Avoid hidden-threat disclosure
Battle SHALL retain a minimum player-centered 3x3 focus with an extra row above for artwork. The nearest clear-line threat SHALL shape the tactical area independently of Perception, without revealing its sprite or identifying information. Walls and closed doors SHALL prevent concealed enemies from shaping the area.

#### Scenario: Nearby hidden enemy
- **WHEN** an enemy triggers Battle through awareness but a wall blocks line of sight
- **THEN** the Battle icon remains visible
- **AND** no enemy-specific tactical area, portrait, marker, or direction cue is shown

#### Scenario: Spatial warning before identification
- **WHEN** a threatening enemy has clear line of sight but exceeds Perception detection distance
- **THEN** the nearest such enemy can shape the tactical area while its sprite and identifying information remain hidden

### Requirement: Extend Battle warning with Perception
Battle SHALL activate when any living active-floor enemy is within the greater of its effective awareness range and the player's detection range of max(1, twice Perception), using Chebyshev distance. Walls SHALL not prevent this warning. Enemy AI awareness SHALL retain its existing range and detection SHALL still require line of sight.

#### Scenario: Receive an early warning
- **WHEN** an enemy is beyond its own awareness but within the player's Perception detection range
- **THEN** Battle activates without granting the enemy additional awareness

#### Scenario: Hidden warning
- **WHEN** a wall blocks detection of an enemy inside Battle warning range
- **THEN** Battle activates without revealing that enemy
