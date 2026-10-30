# campaign-saves Specification

## Purpose

Lets players maintain three independent local campaigns and reliably resume the full active dungeon run after closing or reloading the game.

## Requirements

### Requirement: Provide exactly three independent save slots
The game SHALL expose exactly three independent local campaigns under `3 Saved Games`. Player-facing campaign wording SHALL use Saved Game instead of save slot, with realm and XP-count summaries for occupied games. Campaigns SHALL remain independent and require no account or network access.

#### Scenario: Choose a slot
- **WHEN** the main menu opens
- **THEN** it displays 3 Saved Games with realm/XP summaries or a new-game state

#### Scenario: Keep slots independent
- **WHEN** one Saved Game is updated
- **THEN** the other two campaigns retain their data unchanged

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

### Requirement: Expand undersized saved floors safely
When an otherwise valid saved campaign contains a generated floor smaller than 100 by 100 tiles, the game SHALL expand it into a centered 100 by 100 tile floor before play resumes. The migration SHALL preserve the active floor's terrain, player, entities, time, and progression by applying the same coordinate offset to every retained world position.

#### Scenario: Resume a legacy 40 by 20 floor
- **WHEN** the player loads a valid campaign whose active floor is 40 by 20 tiles
- **THEN** the game resumes it on a 100 by 100 tile floor with the original terrain, player, and entities centered together
- **AND** their relative positions, time, and progression are unchanged

#### Scenario: Resume an already expanded floor
- **WHEN** the player loads a valid campaign whose active floor is already 100 by 100 tiles
- **THEN** the game preserves its map dimensions and world coordinates without applying another offset

### Requirement: Persist Quick Slot state
Campaign saves SHALL persist both Quick Slot positions, their item identities, and their positive quantities. Loading a legacy campaign without Quick Slot state SHALL initialize both positions empty without invalidating the save, while normalized new campaigns SHALL preserve starter Inventory quantities.

#### Scenario: Resume populated Quick Slots
- **WHEN** a campaign is saved with Mana Potion X2 in Quick Slot 02 and reloaded
- **THEN** Quick Slot 02 shows Mana Potion X2 and Inventory, resources, and time remain consistent

#### Scenario: Load a legacy campaign
- **WHEN** a supported campaign has no Quick Slot field
- **THEN** both Quick Slots initialize empty and the campaign remains playable and saveable

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

### Requirement: Migrate stored progression safely
Supported legacy campaigns SHALL migrate to the ten-attribute, capped progression model without deleting original stored data. Existing level and partial XP SHALL be retained within their valid ranges, missing attributes SHALL receive valid minimum values, and obsolete forced-upgrade state SHALL not block play.

#### Scenario: Resume a pre-progression campaign
- **WHEN** a valid earlier campaign is selected
- **THEN** it loads with valid attributes, level, XP, and unspent Attribute Points and can be saved again

### Requirement: Launch complete deterministic URLs without saving
When world, level, slot, run, and seed URL arguments are all valid and present, the game SHALL start the requested deterministic run without reading or writing the matching Saved Game. It SHALL keep unrelated supported URL arguments active.

#### Scenario: Start a deterministic test run
- **WHEN** the game opens with complete valid run identity URL arguments
- **THEN** it starts the requested world, level, slot, run, and seed identity without replacing local Saved Game data

### Requirement: Persist dropped item state
Campaign saves SHALL preserve each dropped object's identity, type, quantity, world coordinate, and any active settled state, as well as the presence of Extra Space and its effective capacity effect.

#### Scenario: Reload beside a dropped item
- **WHEN** a campaign is saved with a dropped Sword on the current floor and then reloaded
- **THEN** the Sword remains at the same world cell and can be collected

#### Scenario: Reload with Extra Space
- **WHEN** a campaign is saved while Extra Space is carried and then reloaded
- **THEN** the same effective capacity is restored

### Requirement: Persist quest progress with a Saved Game
Campaign saves SHALL persist the current quest, each item’s completion state, and the active item. Loading a supported campaign without quest data SHALL initialize My First Quest without discarding existing game progress.

#### Scenario: Resume partial quest progress
- **WHEN** a Saved Game with one completed My First Quest item is reloaded
- **THEN** its completed item and active remaining item are restored unchanged

#### Scenario: Load a pre-quest campaign
- **WHEN** a supported existing Saved Game has no quest data
- **THEN** it receives a new My First Quest with all items unfinished and preserves its other campaign state

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

### Requirement: Open a valid saved game directly from its URL
The game SHALL load a saved game directly when the URL contains exactly one valid slot value of `1`, `2`, or `3`, and SHALL preserve the existing menu flow for missing, malformed, or unavailable slot values.

#### Scenario: Valid slot deep link
- **WHEN** the URL contains `slot=1`, `slot=2`, or `slot=3` and that slot is readable
- **THEN** the game skips the saved-game menu and opens the selected campaign

#### Scenario: Invalid slot deep link
- **WHEN** the URL contains a slot value outside `1`, `2`, or `3`
- **THEN** the game shows the normal saved-game menu

#### Scenario: Empty selected slot
- **WHEN** the URL selects a valid slot that has no saved campaign
- **THEN** the game starts a new campaign in that slot using the URL seed when present

### Requirement: Persist both Jewel positions and Jewel instances
Supported campaigns SHALL save and restore both Jewel positions and Jewel instances in Inventory, generated or dropped floor state, container rewards, and applicable recovery snapshots. Instance identity, definition, fixed modifiers, and location SHALL be retained. Loading and normalization SHALL NOT discard the Jewels group or double-apply its effects.

#### Scenario: Reload a mixed Jewel loadout
- **WHEN** Silver Ring of Vigor and Sapphire Amulet are equipped, Gold Guard Bracelet is carried, and Prismatic Amulet is dropped before saving
- **THEN** reload restores those locations and identities with the expected Health, Mana, and Defense effects and the same ground graphic

#### Scenario: Restore modes without Jewel-specific exceptions
- **WHEN** Classic death, Adventure replacement, or Journey checkpoint recovery occurs
- **THEN** Jewel ownership follows that mode's existing item-retention rules and creates no extra item copies or persistent Jewel buffs

### Requirement: Initialize missing Jewel groups safely
A supported record within the active compatibility epoch that lacks a Jewels group SHALL initialize exactly two empty Jewel positions without changing existing Weapons, Armor, Inventory, abilities, Quick Slots, progression, or resources. Fresh campaigns and fresh replacement runs SHALL initialize both positions empty.

#### Scenario: Load a supported pre-Jewel record
- **WHEN** a supported record has valid Weapons and Armor but no Jewels group
- **THEN** it gains two empty Jewel positions and preserves its remaining committed state

### Requirement: Isolate the development compatibility reset
When this change's incompatible generation balance becomes active, the existing development compatibility mechanism SHALL clear only `rogues-dungeon.` storage once for the new epoch. It SHALL preserve unrelated origin data and records subsequently created under that epoch. Normal same-epoch save and recovery behavior SHALL continue after initialization.

#### Scenario: Enter the new development epoch
- **WHEN** the game first starts with the new epoch and older incompatible game keys exist
- **THEN** only game-namespaced keys are cleared before the new epoch is recorded

#### Scenario: Reload a new Jewel campaign
- **WHEN** the game reloads after a Jewel campaign has been saved under the new epoch
- **THEN** the campaign remains stored and no second compatibility reset occurs
