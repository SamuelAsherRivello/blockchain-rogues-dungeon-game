# browser-template-layout Specification

## Purpose
Provide a reusable browser layout with project content and overlays inside an aspect-ratio viewport and independent external gutters.

## Requirements

### Requirement: Project-defined viewport
The template SHALL fit and center a viewport within the full browser surface using finite positive project-defined width:height dimensions in CSS pixels. It SHALL support portrait, landscape, and square orientations and report actionable errors for invalid or orientation-inconsistent dimensions.

#### Scenario: Orientation and resizing
- **WHEN** a project selects portrait 9:16, landscape 16:9, or square 1:1 and the browser resizes or enters fullscreen
- **THEN** its viewport preserves the selected ratio, fits the available surface, and centers with equal opposing gutters

#### Scenario: Invalid configuration
- **WHEN** dimensions are zero, negative, nonfinite, or inconsistent with the declared orientation
- **THEN** the template reports an actionable configuration error rather than silently distorting the viewport

### Requirement: Independent composition
The template SHALL allow responsive app content inside the viewport and optional React content in external gutters. Content SHALL extend beneath the viewport UI overlay. Gutter content SHALL remain outside the viewport and SHALL NOT reduce its fitted size.

#### Scenario: Content and gutters
- **WHEN** content and gutter elements are supplied and the available dimensions change
- **THEN** content adapts within the viewport and gutter elements stay within residual external space without pushing the viewport inward

### Requirement: CSS resolution independence
Browser, viewport, gutter, and UI dimensions SHALL use CSS pixels without multiplication by device pixel ratio or future game render scale.

#### Scenario: Different display densities
- **WHEN** the same CSS surface size is displayed at DPR 1, 1.25, and 2
- **THEN** viewport dimensions and corner placement remain equivalent in CSS pixels

### Requirement: Content renderer preserves browser layout
The game renderer SHALL run within the viewport content layer, independently of React layout. Backing resolution and world Zoom SHALL not change viewport ratio, external gutters, or UI CSS geometry. The renderer SHALL not intercept input meant for the titlebar, statusbar, panels, or Settings.

#### Scenario: Renderer and UI composition
- **WHEN** world rendering runs in the game region
- **THEN** all primary UI stays within the fitted shell in windowed and fullscreen modes

#### Scenario: Corner interaction above content
- **WHEN** a player operates a replacement titlebar or Settings control
- **THEN** it remains reachable and world input does not consume that interaction

### Requirement: Keep replacement shell actions operable
The game shell SHALL own title, source link, version, Settings, and fullscreen actions without rendering any template corner unit. The source link SHALL retain protected new-tab behavior; version SHALL come from the root version source. Fullscreen state and preference SHALL synchronize with browser events and failures.

#### Scenario: Operate actions after removing corners
- **WHEN** the player enters fullscreen, exits it using browser controls, follows GitHub, or reads version
- **THEN** the replacement controls remain usable, fullscreen state stays accurate, the source link is protected, and version matches the root file

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
