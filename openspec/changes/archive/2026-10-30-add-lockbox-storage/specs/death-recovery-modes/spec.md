# Spec delta

## MODIFIED Requirements

### Requirement: Preserve the selected death contract
Each campaign SHALL retain its confirmed mode for its lifetime. Classic SHALL end its campaign at death; Adventure SHALL recover at the original entry state of the current Dungeon Level while retaining long-term progression and losing run possessions; Journey SHALL recover the newest valid checkpoint, subject to reconciliation with committed persistent lockbox transfers. Every mode SHALL preserve the Saved Game's current lockbox contents, and recovery SHALL NOT duplicate transferred item ownership.

#### Scenario: Recover an Adventure campaign
- **WHEN** an Adventure character dies on Dungeon Level 3
- **THEN** Restart Level resumes a fresh Level 3 layout from that campaign's deterministic entry state with its current persistent progression and without its run Inventory or equipped gear
- **AND** its Saved Game's lockboxes retain their latest committed contents

#### Scenario: Recover a Journey campaign
- **WHEN** a Journey character dies after a newer valid checkpoint was recorded
- **THEN** Resume at Checkpoint restores that checkpoint's player, world, and discovery state except for ownership reconciliation required by committed lockbox transfers
- **AND** lockboxes retain their latest committed contents without duplicating items or quantities in restored possessions or world pickups

#### Scenario: End a Classic campaign
- **WHEN** a Classic character dies
- **THEN** its active campaign is no longer resumable and the only recovery action is Return to Main Menu
- **AND** its Saved Game retains shared lockbox contents for a later new character in that Saved Game
