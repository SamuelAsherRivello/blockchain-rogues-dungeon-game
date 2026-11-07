# developer-theme-control Specification

## Purpose

Allow developers to inspect dungeon themes through the visible developer settings controls.

## Requirements

### Requirement: Cycle themes in desktop developer settings
The desktop developer settings heading SHALL read `(D.Set.)`. A button SHALL display `T:` followed by the active theme number and cycle themes 1, 2, 3, then 1 on successive clicks. The world and minimap SHALL reflect the selected theme.

#### Scenario: Cycle the active theme
- **WHEN** theme 1 is active and the player clicks `T:1`
- **THEN** theme 2 is shown and the button reads `T:2`

#### Scenario: Wrap around
- **WHEN** theme 3 is active and the player clicks `T:3`
- **THEN** theme 1 is shown and the button reads `T:1`

### Requirement: Remove the theme keyboard shortcut
Pressing T SHALL NOT cycle the dungeon theme.

#### Scenario: Press T during gameplay
- **WHEN** the player presses T while the game is active
- **THEN** the active theme remains unchanged
