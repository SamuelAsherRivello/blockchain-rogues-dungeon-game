# Spec Delta

## MODIFIED Requirements

### Requirement: Support landscape and portrait game aspects
The desktop layout SHALL use a fitted landscape shell ranging from 16:10 through 16:9. Mobile SHALL use the landscape range specified by mobile-landscape-layout. A desktop-only developer layout preview SHALL switch layouts without changing gameplay state.

#### Scenario: Render on mobile
- **WHEN** the game opens on a mobile platform
- **THEN** it uses the mobile landscape layout automatically

#### Scenario: Render on PC
- **WHEN** the game opens on a PC without a saved mobile preview
- **THEN** it uses the existing desktop landscape shell, including in a tall desktop window

#### Scenario: Use an intermediate fitted ratio
- **WHEN** the available surface ratio falls within the active layout's supported range
- **THEN** the shell uses that intermediate ratio without changing campaign, time, camera, or zoom

#### Scenario: Preview either aspect on PC
- **WHEN** a developer switches the layout on PC
- **THEN** the shell switches layouts without changing campaign, time, or saved preferences; mobile uses its own effective defaults

### Requirement: Show control legend and developer area
The desktop statusbar SHALL show the existing control legend and developer area. Developer settings SHALL be restricted to desktop developer sessions; a desktop mobile preview SHALL provide a return action in Settings.

#### Scenario: Play a production session
- **WHEN** developer mode is disabled
- **THEN** no developer layout switch or Dev Settings area is shown

#### Scenario: Preview the other aspect
- **WHEN** a desktop developer selects mobile layout
- **THEN** the mobile layout appears without changing campaign state, time, or saved preferences

## REMOVED Requirements

### Requirement: Provide mobile eight-way movement
**Reason**: The first landscape mobile control scheme uses game-view taps.
**Migration**: Follow the touch gameplay requirement in mobile-landscape-layout.

### Requirement: Keep the portrait lower area available without tabs
**Reason**: Mobile now uses a landscape composition with a primary column.
**Migration**: Follow the mobile game screen composition requirement.
