# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, realm/map, active prefab context when present, entities, player position, time, attributes/resources, XP, Inventory, equipment, ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level, Difficulty, and active map context, is restored without retaining a transient drag preview

#### Scenario: Resume a changed generated level
- **WHEN** an occupied Saved Game is resumed with saved level-state deltas
- **THEN** the generated level is reconstructed with the same player-caused object, actor, pickup, and removal changes

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

#### Scenario: Resume inside a prefab
- **WHEN** the player reloads after entering a teleport prefab
- **THEN** the player resumes in the same active prefab context and prefab position without advancing the dungeon level

