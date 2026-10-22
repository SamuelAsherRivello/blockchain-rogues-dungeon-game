# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, realm/map, active prefab context when present, entities, player position, time, attributes/resources, XP, Inventory, equipment, three ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

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

#### Scenario: Save a completed progression award
- **WHEN** character confirmation commits a completed award and its automatic world growth
- **THEN** the game persists both changes and the applied award ID together without advancing time

### Requirement: Handle unavailable local storage
If localStorage cannot be read or written, the game SHALL present a clear save error and SHALL keep the current campaign playable for the current page session.

#### Scenario: Storage write fails
- **WHEN** the browser rejects a save write
- **THEN** the player sees that progress could not be saved and can continue the active session

### Requirement: Restore application view preferences
Zoom, Camera, desired Fullscreen, and the Url Args developer setting SHALL be stored in localStorage and restored on load/refresh independently of the selected Saved Game. Url Args SHALL default to off. Invalid or unavailable preferences SHALL use defaults 1, Center, windowed, and Url Args off while keeping play usable. Developer aspect preview SHALL not be persisted as a player preference.

#### Scenario: Reload selected view preferences
- **WHEN** Zoom 2 and Camera Screen were stored before refresh
- **THEN** the app restores those settings without requiring a campaign save

#### Scenario: Show deterministic URL arguments
- **WHEN** Url Args is enabled during an active deterministic run
- **THEN** the current URL includes world, level, slot, run, and seed arguments for that run

#### Scenario: Keep ordinary player URLs clean
- **WHEN** Url Args is disabled
- **THEN** the current URL omits world, level, slot, run, and seed arguments while preserving unrelated supported URL arguments

#### Scenario: Invalid preference record
- **WHEN** preference data is missing, malformed, or out of range
- **THEN** supported defaults are used without preventing a new or resumed game

### Requirement: Restore fullscreen intent through browser permissions
The app SHALL distinguish stored fullscreen preference from actual browser fullscreen. A stored enabled preference SHALL request entry when a permitted user gesture is available after load. Fullscreen events, user exits, and failures SHALL synchronize the actual control state without falsely reporting entry or interrupting play.

#### Scenario: Browser blocks automatic entry after refresh
- **WHEN** fullscreen preference is enabled but the browser requires a gesture
- **THEN** the preference is retained, the control reflects windowed reality, and entry is requested on the next permitted interaction

#### Scenario: Exit with browser controls
- **WHEN** the player exits fullscreen through browser controls
- **THEN** actual state and stored preference update to windowed

### Requirement: Migrate supported legacy campaigns without deletion
Supported legacy campaigns SHALL preserve supported persistent progression while replacing their active run with a new deterministic Level 1. The migration SHALL retain an original backup before replacing the primary record. Legacy realm, position, entities, Time, Inventory, equipment, and full-floor snapshots SHALL not remain playable. A migration failure SHALL mark the Saved Game invalid while leaving its original stored content intact. Any obsolete fourth ability binding SHALL be discarded during normalization.

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

### Requirement: Expand undersized saved floors safely
When an otherwise valid saved campaign contains a generated floor smaller than 100 by 100 tiles, the game SHALL expand it into a centered 100 by 100 tile floor before play resumes. The migration SHALL preserve the active floor's terrain, player, entities, time, and progression by applying the same coordinate offset to every retained world position.

#### Scenario: Resume a legacy 40 by 20 floor
- **WHEN** the player loads a valid campaign whose active floor is 40 by 20 tiles
- **THEN** the game resumes it on a 100 by 100 tile floor with the original terrain, player, and entities centered together
- **AND** their relative positions, time, and progression are unchanged

#### Scenario: Resume an already expanded floor
- **WHEN** the player loads a valid campaign whose active floor is already 100 by 100 tiles
- **THEN** the game preserves its map dimensions and world coordinates without applying another offset
