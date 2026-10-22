# Spec Delta

## ADDED Requirements

### Requirement: Keep overlays contained at the supported compact PC size
The fitted landscape viewport SHALL keep browser-facing dialogs, menus, tooltips, and their interactive content within the viewport at every supported compact PC size. Flexible dialog bodies SHALL remain accessible through internal scrolling when their content cannot fit without clipping.

#### Scenario: Open a menu dialog in a compact PC shell
- **WHEN** a player opens Settings or Create Character in the smallest supported PC landscape shell
- **THEN** the dialog remains within the viewport safe area, its controls do not extend outside its border, and any necessary scrolling is internal to the dialog body

#### Scenario: Resize an open dialog across layout tiers
- **WHEN** the PC browser is resized from a generous landscape shell through compact landscape sizes while a dialog is open
- **THEN** the dialog recomputes its available size and remains operable without page-level scrolling or clipped primary actions

### Requirement: Preserve viewport and renderer independence during compact layout
Compact UI adaptation SHALL change only React/CSS presentation geometry and SHALL NOT change the fitted 16:9 viewport ratio, renderer backing resolution, selected world Zoom, camera state, or game state.

#### Scenario: Reduce the PC browser width during gameplay
- **WHEN** the fitted landscape shell crosses a compact layout threshold
- **THEN** the world renderer remains in its assigned region with the same selected game Zoom while surrounding UI adapts

#### Scenario: Restore a generous PC browser size
- **WHEN** the browser grows from a compact shell back to a generous landscape shell
- **THEN** the full-size presentation returns without changing campaign state, camera state, or world Zoom
