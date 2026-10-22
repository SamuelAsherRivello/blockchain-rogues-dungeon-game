# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, world-generation attributes, realm/map, active prefab context when present, entities, player position, time, attributes/resources, XP, Inventory, equipment, ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level, Difficulty, world-generation attributes, active map context, and run identity, is restored without retaining a transient drag preview

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

### Requirement: Create before occupying an empty Saved Game
Selecting an empty Saved Game SHALL open Create Character instead of immediately creating a campaign. It SHALL retain its idle player preview, compact profile, ten values, Roll, Confirm, and close controls. Character confirmation SHALL open Create World with ten world attributes, tooltips, roll/confirm controls, identity, and minimap preview. Closing either stage SHALL leave the Saved Game empty; only final world confirmation SHALL persist the campaign.

#### Scenario: Cancel creation
- **WHEN** the player closes Create Character or Create World before confirmation
- **THEN** the player returns to the main menu and the selected Saved Game remains empty

#### Scenario: Start a new Saved Game
- **WHEN** the player confirms a rolled character sheet and a rolled world sheet
- **THEN** that Saved Game becomes occupied and reload restores its committed character progression, world attributes, and run identity

## ADDED Requirements

### Requirement: Restore each floor from its original generation profile
Compact saves SHALL retain the immutable generation profile for each visited floor and apply its saved changes against that profile. A later world upgrade SHALL NOT change the base of any visited floor during saving, restoration, or return travel.

#### Scenario: Save after world growth
- **WHEN** the player upgrades world attributes while on a previously generated floor and then saves
- **THEN** reload restores that floor's original terrain and generated IDs before applying saved removals and overrides

### Requirement: Preserve world progression across run resets
Campaign saves SHALL retain committed world growth, pending earned-level events, partial spending counters, and applied event IDs across reload and death. Death SHALL advance Run and clear run-specific floor profiles while retaining persistent progression.

#### Scenario: Die before spending earned points
- **WHEN** the player dies with a pending world event and later completes that character award
- **THEN** the event retains its recorded seed inputs and applies exactly once

### Requirement: Migrate generation rules without silently rebuilding worlds
Migration SHALL back up original saved data, retain supported legacy generation rules for existing floors, and initialize missing future world attributes to a documented neutral profile. Unsupported generator versions SHALL leave saved bytes intact and report the save unavailable rather than regenerate with current rules.

#### Scenario: Load a supported compact legacy save
- **WHEN** its floor has no attribute profile
- **THEN** the game reconstructs it using its legacy generator and original difficulty, records that profile, and preserves its existing deltas without granting historical world awards

#### Scenario: Load an unsupported generator version
- **WHEN** the original floor generator cannot be reconstructed
- **THEN** the game preserves the save and reports it unavailable without overwriting its version or floor data
