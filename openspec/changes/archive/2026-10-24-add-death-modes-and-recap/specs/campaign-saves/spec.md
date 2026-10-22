# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete live campaign after reload, including its death-recovery mode, Dungeon Level, persistent Difficulty, realm/map, entities, player position, time, attributes/resources, XP, Inventory, equipment, ability bindings, objectives, counters, discovery state, Log, and applicable recovery snapshots. Save & Return to Main Menu SHALL persist the latest committed live state before returning. A cleared Classic campaign SHALL not resume.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level, Difficulty, mode, and discovery state, is restored without retaining a transient drag preview

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

#### Scenario: Resume a changed generated level
- **WHEN** an occupied Saved Game is resumed with saved level-state deltas
- **THEN** the generated level is reconstructed with the same player-caused object, actor, pickup, and removal changes

#### Scenario: Resume inside a prefab
- **WHEN** the player reloads after entering a teleport prefab
- **THEN** the player resumes in the same active prefab context and prefab position without advancing the dungeon level

#### Scenario: Save a completed progression award
- **WHEN** character confirmation commits a completed award and its automatic world growth
- **THEN** the game persists both changes and the applied award ID together without advancing time

#### Scenario: Do not resume a fallen Classic campaign
- **WHEN** a Classic character dies and the page reloads before returning to the menu
- **THEN** its Saved Game is unavailable to resume

### Requirement: Create before occupying an empty Saved Game
Selecting an empty Saved Game SHALL open Select Mode instead of immediately creating a campaign. After the player confirms a mode, Create Character SHALL show its idle player preview, compact character profile, ten attribute values, Roll, Confirm, and close controls; it SHALL then retain the existing Create World flow. Closing either pre-creation dialog SHALL leave the Saved Game empty.

#### Scenario: Cancel mode selection
- **WHEN** the player closes Select Mode before confirmation
- **THEN** the player returns to the main menu and the selected Saved Game remains empty

#### Scenario: Cancel creation
- **WHEN** the player closes Create Character or Create World before confirmation
- **THEN** the player returns to the previous creation step or main menu and the selected Saved Game remains empty

#### Scenario: Start a new Saved Game
- **WHEN** the player confirms a mode, a rolled character sheet, and a world
- **THEN** that Saved Game becomes occupied and reload restores its committed character progression and selected mode

## ADDED Requirements

### Requirement: Migrate existing campaigns to the recommended death mode
A valid campaign written before death-recovery modes SHALL migrate to Adventure without deleting its supported live state. Migration SHALL initialize a valid level-entry recovery state from the campaign's deterministic identity and leave malformed data unavailable rather than silently creating a different mode.

#### Scenario: Load a pre-mode campaign
- **WHEN** a valid existing Saved Game without a death-recovery mode is loaded
- **THEN** it remains playable as Adventure and retains its supported progression and active campaign state

### Requirement: Persist Journey checkpoints deliberately
A Journey campaign SHALL record a recovery checkpoint on entry through stairs and after a completed paid campfire rest. It SHALL replace only the prior checkpoint for that campaign and SHALL not record one for unanswered campfire interaction, a failed rest, Classic, or Adventure.

#### Scenario: Complete a Journey campfire rest
- **WHEN** a Journey player completes a paid campfire rest
- **THEN** the resulting committed campaign state becomes the newest recovery checkpoint

