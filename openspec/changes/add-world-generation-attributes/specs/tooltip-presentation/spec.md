# Spec Delta

## MODIFIED Requirements

### Requirement: Render concise tooltips for React UI elements
The application SHALL render a short, wide text tooltip for a React UI element when that element is hovered or receives keyboard focus, SHALL keep the complete tooltip within the application viewport, and SHALL provide the ten world attributes with concise generation-effect explanations.

#### Scenario: Hover or focus a UI element
- **WHEN** a tooltip-enabled React UI element is hovered by a pointer or receives keyboard focus
- **THEN** a compact horizontal text tooltip appears for that element and remains fully inside the application viewport

#### Scenario: UI tooltip near a viewport edge
- **WHEN** the default tooltip position would extend beyond an edge of the application viewport
- **THEN** the tooltip is repositioned within the viewport without clipping its text

#### Scenario: Inspect a world attribute tooltip
- **WHEN** the player hovers or focuses one of the ten world attributes during Create World or World progression
- **THEN** the tooltip states the positive gameplay effect that higher values provide

#### Scenario: Inspect generation identity help
- **WHEN** the player hovers or focuses the Generation Identity help trigger
- **THEN** the tooltip explains that the five displayed identity values also require saved attributes, difficulty, and generation rules to reproduce a custom floor
