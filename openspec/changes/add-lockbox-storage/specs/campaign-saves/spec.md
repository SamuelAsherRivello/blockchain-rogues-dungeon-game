# Spec delta

## ADDED Requirements

### Requirement: Persist independent lockboxes per Saved Game
Each Saved Game SHALL persist the two home lockboxes independently in localStorage. Contents SHALL survive level travel, reload, every death mode, and replacement-character creation following Classic death. Missing lockbox data SHALL initialize empty. A missing or removed authored placement SHALL NOT erase stored contents. Different Saved Games SHALL NOT share storage.

#### Scenario: Reload stored items
- **WHEN** the player deposits different items into the two lockboxes and reloads
- **THEN** both lockboxes retain their own contents and the corresponding items remain absent from Inventory

#### Scenario: Switch Saved Games
- **WHEN** Saved Game 1 contains stored items and the player opens Saved Game 2
- **THEN** Saved Game 2 exposes only its own lockbox contents

#### Scenario: Start after Classic death
- **WHEN** a Classic campaign dies and a new character is created in the same Saved Game
- **THEN** the dead campaign remains non-resumable and the new character can access that Saved Game's retained lockboxes

#### Scenario: Load a supported save without storage
- **WHEN** a supported existing Saved Game has no lockbox state
- **THEN** its lockboxes initialize empty without resetting its otherwise supported campaign

### Requirement: Save a storage transfer as one durable operation
A valid lockbox transfer SHALL save its resulting Inventory, lockbox contents, and ownership-reconciliation state together immediately, independently of time advancement. A failed write SHALL leave both containers unchanged, display the existing save-error feedback, and keep the session playable. Reload SHALL observe either the complete old ownership or complete new ownership.

#### Scenario: Reload immediately after transfer
- **WHEN** the player completes a storage drag and reloads before taking another turn
- **THEN** the transferred item exists exactly once in its committed destination

#### Scenario: Reject a storage write
- **WHEN** localStorage rejects a transfer write
- **THEN** the source retains the item, the destination remains unchanged, and saving-unavailable feedback appears

### Requirement: Preserve storage ownership through recovery
Lockbox contents and committed transfers SHALL remain authoritative when an active campaign or recovery snapshot is restored. Recovery SHALL NOT recreate an already deposited item or stack quantity in carried possessions or world pickups, revert a withdrawal into storage, or replay a transfer. Recovery state unrelated to persistent storage SHALL retain its selected mode's behavior.

#### Scenario: Recover a pre-deposit checkpoint
- **WHEN** a Journey checkpoint predates a committed deposit and the character dies
- **THEN** the lockbox retains the deposit and recovery does not also restore that deposited item or quantity to possessions or the world

#### Scenario: Recover after a withdrawal
- **WHEN** a character withdraws an item and later dies
- **THEN** recovery does not put that item back into the lockbox and treats the withdrawn possession under the selected mode's recovery rules

### Requirement: Clear retained storage with the game's explicit storage reset
The game's explicit Clear Local Storage action SHALL clear retained lockboxes together with its other promised game data. Death handling SHALL preserve retained lockboxes and SHALL NOT be treated as that explicit reset.

#### Scenario: Clear game data
- **WHEN** the player confirms Clear Local Storage
- **THEN** a later new Saved Game begins with empty lockboxes

## MODIFIED Requirements

### Requirement: Launch complete deterministic URLs without saving
When world, level, slot, run, and seed URL arguments are all valid and present, the game SHALL start the requested deterministic run without reading or writing the matching Saved Game, including its persistent lockboxes. It SHALL keep unrelated supported URL arguments active. Its lockboxes SHALL use isolated in-memory contents for that inspection session.

#### Scenario: Start a deterministic test run
- **WHEN** the game opens with complete valid run identity URL arguments
- **THEN** it starts the requested world, level, slot, run, and seed identity without replacing local Saved Game data

#### Scenario: Use inspection-session storage
- **WHEN** an inspection session opens a lockbox or transfers an item
- **THEN** persistent Saved Game lockbox contents are neither read nor written and the session's containers remain usable in memory
