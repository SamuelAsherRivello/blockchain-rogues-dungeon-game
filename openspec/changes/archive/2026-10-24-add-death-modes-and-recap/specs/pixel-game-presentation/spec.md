# Spec Delta

## ADDED Requirements

### Requirement: Present mode selection and death recap through shared dialogs
Select Mode SHALL use the same fitted bounds and menu density as Create Character. Death recap SHALL use the in-game Settings dialog's centered game-view placement, palette, and footer-button density while leaving the fatal world visibly frozen beneath it after the player death animation finishes and holds. Its visual hierarchy SHALL separate the death title, two-line factual recap summary, paired Minimap and Log cards, and stacked full-width bottom recovery actions without copying an external game's theme. Both dialogs SHALL keep primary controls reachable in generous and compact layouts.

#### Scenario: Select a mode in a compact layout
- **WHEN** an empty Saved Game opens Select Mode at the compact threshold
- **THEN** its three choices, traits panel, close control, and Confirm Mode action remain readable and reachable inside the dialog

#### Scenario: Show a centered death recap
- **WHEN** the player dies while the in-game view is active
- **THEN** the recap is centered over that view and gameplay controls cannot advance the world until a recap action is selected

#### Scenario: Emphasize the selected recovery action
- **WHEN** a death recap presents more than one action
- **THEN** one action is visibly selected in the footer without obscuring the recap summary

