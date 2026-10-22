# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after closing or reloading, including Dungeon Level, persistent Difficulty, world-generation attributes, realm/map, entities, player position, time, attributes/resources, XP, Inventory, equipment, ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level, Difficulty, world-generation attributes, and run identity, is restored without retaining a transient drag preview

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

### Requirement: Create before occupying an empty Saved Game
Selecting an empty Saved Game SHALL open Create Character instead of immediately creating a campaign. After a valid character confirmation, Create World SHALL open before the Saved Game is occupied. Create World SHALL show the ten world attributes, their tooltips, Roll, Confirm, a generation identity panel, and a deterministic minimap preview. Closing either creation window before confirmation SHALL leave the Saved Game empty; confirmation SHALL persist the generated campaign.

#### Scenario: Cancel creation
- **WHEN** the player closes Create Character or Create World before confirmation
- **THEN** the player returns to the main menu and the selected Saved Game remains empty

#### Scenario: Start a new Saved Game
- **WHEN** the player confirms a rolled character sheet and a rolled world sheet
- **THEN** that Saved Game becomes occupied and reload restores its committed character progression, world attributes, and run identity
