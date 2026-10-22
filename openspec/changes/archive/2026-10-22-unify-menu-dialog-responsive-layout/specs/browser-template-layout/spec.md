# Spec Delta

## ADDED Requirements

### Requirement: Recompute bounded dialog geometry after viewport changes
Dialogs opened from the menu SHALL use the Start Game rectangle for their initial position and size, then recompute their bounded geometry whenever the fitted viewport changes size or density.

#### Scenario: Open a menu dialog
- **WHEN** the player opens Settings, Create Character, or Create World from the Start Game menu
- **THEN** the dialog occupies the Start Game rectangle and is positioned over the same menu area

#### Scenario: Resize an open menu dialog
- **WHEN** the browser or fullscreen state changes the fitted viewport while a menu dialog is open
- **THEN** the dialog remains aligned with the current Start Game geometry or uses the current compact safe-area geometry without clipped controls

### Requirement: Keep in-game Settings within the fitted shell
Settings opened during gameplay SHALL preserve its current centered placement and scale while selecting the generous or compact typography mode from the same fitted-shell density policy as the Start Game menu.

#### Scenario: Open Settings during generous gameplay
- **WHEN** gameplay is shown in a generously sized fitted shell and the player opens Settings
- **THEN** Settings is centered at its existing game placement and uses the generous presentation

#### Scenario: Open Settings during compact gameplay
- **WHEN** gameplay is shown in a compact fitted shell and the player opens Settings
- **THEN** Settings remains centered, fits within the shell, and uses the compact presentation with internal body scrolling only when necessary
