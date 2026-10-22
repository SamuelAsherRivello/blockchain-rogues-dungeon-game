# Spec Delta

## Purpose

Define a campaign's chosen death contract and the focused recap that turns a defeat into a clear next decision.

## ADDED Requirements

### Requirement: Choose a death-recovery mode before character creation
Selecting an empty Saved Game SHALL open Select Mode before Create Character. It SHALL offer Journey, Adventure, and Classic from lightest to hardest, labeled Easy, Default, and Hard respectively. Selecting a card SHALL update its description and Berlin-style traits, but only Confirm SHALL advance. Closing SHALL leave the Saved Game empty.

#### Scenario: Confirm a selected mode
- **WHEN** the player selects Adventure and confirms it
- **THEN** Create Character opens and the new campaign uses Adventure after character and world creation

#### Scenario: Cancel mode selection
- **WHEN** the player closes Select Mode before confirmation
- **THEN** the player returns to the main menu and the Saved Game remains empty

### Requirement: Explain Berlin-style traits accurately
Select Mode SHALL show the nine high-value and six supporting Berlin Interpretation traits for the selected mode. It SHALL mark Classic as satisfying permadeath, Adventure and Journey as not satisfying permadeath, and all modes as not using ASCII display; it SHALL not claim that any mode universally complies with the Berlin Interpretation.

#### Scenario: Compare recovery modes
- **WHEN** the player changes selection from Classic to Journey
- **THEN** the permadeath trait changes from a positive to a negative result while the shared traits remain intelligible

### Requirement: Preserve the selected death contract
Each campaign SHALL retain its confirmed mode for its lifetime. Classic SHALL end its campaign at death; Adventure SHALL recover at the original entry state of the current Dungeon Level while retaining long-term progression and losing run possessions; Journey SHALL recover the newest valid checkpoint exactly.

#### Scenario: Recover an Adventure campaign
- **WHEN** an Adventure character dies on Dungeon Level 3
- **THEN** Restart Level resumes a fresh Level 3 layout from that campaign's deterministic entry state with its current persistent progression and without its run Inventory or equipped gear

#### Scenario: Recover a Journey campaign
- **WHEN** a Journey character dies after a newer valid checkpoint was recorded
- **THEN** Resume at Checkpoint restores that checkpoint's player, world, and discovery state

#### Scenario: End a Classic campaign
- **WHEN** a Classic character dies
- **THEN** its Saved Game is no longer resumable and the only recovery action is Return to Main Menu

### Requirement: Present a focused death recap
At death, gameplay input and world simulation SHALL stop while the player sprite plays its one-shot death animation in place, holds on its final frame, and waits one second before a non-dismissable dialog appears centered over the visible game view. The dialog SHALL present `YOU DIED`, then `World <world> · Level <level>` and `<discovered>% map discovered · <progress>% to next XP level`, followed by paired read-only Minimap and Log cards containing the final ordered combat lines. The dialog SHALL use the in-game Settings geometry, palette, and stacked full-width bottom action-button treatment, with no outer dialog scrollbar. Its default action SHALL be visibly selected; arrow keys SHALL change the selection, Enter SHALL activate it, and direct mouse activation SHALL not require a second confirmation. The dialog SHALL show no movement or encounter-transition noise.

#### Scenario: Show an informative fatal encounter
- **WHEN** an enemy reduces the player to zero Health
- **THEN** the recap includes recent player/enemy damage lines, the fatal enemy's defeat line, and `You died.` in that order

#### Scenario: Finish the player death presentation before the recap
- **WHEN** an enemy reduces the player to zero Health
- **THEN** the player plays the one-shot death animation in place, the final frame holds for one second, and only then does the recap appear while the world remains unable to advance

#### Scenario: Offer mode-specific actions
- **WHEN** the recap opens for Adventure or Journey
- **THEN** it offers a selected default primary recovery action and Return to Main Menu in the dialog footer

#### Scenario: Choose Adventure recovery
- **WHEN** an Adventure recap opens
- **THEN** Restart Level is selected by default, and arrow-key selection or a direct mouse action can activate the chosen recovery

#### Scenario: Present a terminal Classic recap
- **WHEN** a Classic recap opens
- **THEN** Return to Main Menu is its only action and no retry action or recovery explanation is shown

