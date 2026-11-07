# Mobile landscape layout

## Purpose

Provide a playable landscape phone layout and a desktop developer preview while preserving the desktop game experience.

## ADDED Requirements

### Requirement: Select the mobile layout
Mobile devices SHALL automatically use the mobile layout, while desktop browsers SHALL use desktop by default. The mobile work-in-progress block SHALL not prevent play.

#### Scenario: Open on a phone
- **WHEN** a mobile device opens the game
- **THEN** the playable mobile layout is available without a player layout choice

### Requirement: Fit mobile landscape
The mobile landscape viewport SHALL flex continuously from 16:10 through 20:9. It SHALL retain existing mobile fullscreen and portrait-device rotation behavior.

#### Scenario: Use a 19.5:9 phone
- **WHEN** the available landscape surface has a 19.5:9 ratio
- **THEN** the viewport uses that ratio without aspect-fit side bars

#### Scenario: Resize inside supported range
- **WHEN** the landscape surface ratio changes within the supported range
- **THEN** the game view absorbs the width change without cropping primary content

### Requirement: Compose the mobile game screen
Mobile SHALL retain the title bar, omit the status bar, and initially display the existing primary information column to the right of the game view. A square minimap SHALL overlay the upper-right of the game view as its only new mobile HUD element.

#### Scenario: Play on mobile
- **WHEN** a campaign is open in mobile layout
- **THEN** the game view, primary column, title bar, and overlaid minimap are visible without the desktop secondary column or status bar

### Requirement: Toggle mobile information panels
The mobile title bar SHALL provide a Panels button that immediately toggles the single right-hand column between the existing desktop primary and secondary panel content.

#### Scenario: Show the secondary panel
- **WHEN** a mobile player selects Panels while the primary panel is visible
- **THEN** the secondary panel replaces it in the right-hand column, including its existing minimap, while the game-view minimap remains visible

#### Scenario: Return to the primary panel
- **WHEN** a mobile player selects Panels while the secondary panel is visible
- **THEN** the primary panel replaces it in the right-hand column

### Requirement: Support touch gameplay
A tap on a game-view square SHALL invoke the corresponding desktop left-click behavior. Essential existing actions and dialogs SHALL remain reachable by touch for a playable first pass, except Wait and Sneak, which are unavailable on mobile for now.

#### Scenario: Tap a reachable square
- **WHEN** the player taps a reachable game-view square
- **THEN** the same navigation or interaction rules apply as a desktop left-click on that square

### Requirement: Apply mobile defaults and shared preferences
Mobile SHALL hide the zoom, camera, and movement title-bar dropdowns and use mobile defaults regardless of saved values. Mobile zoom SHALL be 1.0, camera SHALL be centered, and movement SHALL use grid-tween. Existing desktop preferences SHALL remain intact without platform-specific preference keys.

#### Scenario: Open with saved preferences
- **WHEN** mobile starts with or without saved zoom or camera preferences
- **THEN** zoom is 1.0, camera mode is center, and movement mode is grid-tween

#### Scenario: View the mobile title bar
- **WHEN** the mobile layout is shown
- **THEN** zoom, camera, and movement dropdowns are absent

### Requirement: Preview mobile on desktop
Development settings on desktop SHALL provide a persisted L:D / L:M layout switch, initially desktop. A desktop browser in mobile preview SHALL offer Layout: Desktop in Settings. Actual mobile users SHALL NOT see this return action or developer settings.

#### Scenario: Return from mobile preview
- **WHEN** a desktop developer selects Layout: Desktop in Settings while previewing mobile
- **THEN** desktop layout is restored and the choice persists without changing campaign state

#### Scenario: Open on mobile after a desktop preview selection
- **WHEN** an actual mobile device starts
- **THEN** it uses mobile layout regardless of the desktop preview override
