# Spec Delta

## ADDED Requirements

### Requirement: Render the Create World preview after layout sizing
The Create World dialog SHALL render its generated world preview whenever a preview campaign is available, including after the preview region first receives dimensions and after compact-layout or viewport resizing.

#### Scenario: Show a generated preview
- **WHEN** the Create World dialog has a preview campaign and its preview region has a measurable width and height
- **THEN** the preview displays the generated world map and player marker

#### Scenario: Recover from an initially unavailable preview size
- **WHEN** the preview renderer initializes before its host has usable dimensions
- **THEN** it retries or redraws after the host becomes measurable and displays the preview without requiring the player to reopen the dialog

#### Scenario: Resize the preview
- **WHEN** the Create World dialog changes between generous and compact fitted layouts
- **THEN** the preview remains visible and is redrawn to the available preview region without changing the generated world
