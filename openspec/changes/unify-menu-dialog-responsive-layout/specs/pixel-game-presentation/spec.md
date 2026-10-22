# Spec Delta

## ADDED Requirements

### Requirement: Share menu density across dialog windows
The Start Game window SHALL define the generous and compact typography and spacing modes used by menu Settings, Create Character, Create World, and in-game Settings. Settings labels SHALL use the same size as Saved Game text at each mode and SHALL remain normal weight.

#### Scenario: Render generous menu dialogs
- **WHEN** the fitted landscape shell has enough space for the generous Start Game presentation
- **THEN** menu Settings, Create Character, Create World, and in-game Settings use the corresponding generous text and spacing sizes

#### Scenario: Render compact menu dialogs
- **WHEN** the fitted landscape shell crosses the compact presentation threshold
- **THEN** all four dialog types use the corresponding compact text and spacing sizes while keeping their controls readable and reachable

### Requirement: Keep dialog content usable through density changes
Menu Settings, Create Character, Create World, and in-game Settings SHALL preserve their complete primary actions and readable content when switching between generous and compact modes.

#### Scenario: Resize while a dialog is open
- **WHEN** the fitted shell changes between generous and compact density while one of these dialogs is open
- **THEN** the dialog updates its typography and spacing without clipping its title, controls, or primary action
