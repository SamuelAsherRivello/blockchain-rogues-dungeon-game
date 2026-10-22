# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, realm/map, active prefab context when present, entities, player position, time, attributes/resources, XP, Inventory, equipment occupancy, combat roll state, ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including two-slot equipment occupancy, active map context, and later combat roll outcomes, is restored without retaining a transient drag preview

#### Scenario: Resume a changed generated level
- **WHEN** an occupied Saved Game is resumed with saved level-state deltas
- **THEN** the generated level is reconstructed with the same player-caused object, actor, pickup, and removal changes

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

#### Scenario: Resume inside a prefab
- **WHEN** the player reloads after entering a teleport prefab
- **THEN** the player resumes in the same active prefab context and prefab position without advancing the dungeon level

#### Scenario: Save a completed progression award
- **WHEN** character confirmation commits a completed award and its automatic world growth
- **THEN** the game persists both changes and the applied award ID together without advancing time

### Requirement: Migrate supported legacy campaigns without deletion
Supported legacy campaigns SHALL preserve supported persistent progression while replacing their active run with a new deterministic Level 1. The migration SHALL retain an original backup before replacing the primary record. Legacy realm, position, entities, Time, Inventory, equipment, and full-floor snapshots SHALL not remain playable. A migration failure SHALL mark the Saved Game invalid while leaving its original stored content intact. Legacy equipment occupancy is normalized only within the preserved migration path.

#### Scenario: Resume a legacy campaign
- **WHEN** a valid previous campaign is selected
- **THEN** it starts a new deterministic Level 1 with its supported persistent progression and no legacy run state

#### Scenario: Preserve the legacy backup
- **WHEN** a valid previous campaign is reset into a deterministic run
- **THEN** the game retains its original serialized data as a migration backup before replacing the primary Saved Game

#### Scenario: Discard the removed legacy binding
- **WHEN** a supported legacy campaign contains an ability in position 04
- **THEN** position 04 is absent after migration without marking the Saved Game invalid

#### Scenario: Preserve a failed migration
- **WHEN** a legacy campaign cannot be migrated
- **THEN** its data remains stored and the menu clearly marks it as unavailable to resume
