# Spec Delta

## MODIFIED Requirements

### Requirement: Support landscape and portrait game aspects
The game SHALL support a fitted landscape shell whose aspect flexes continuously from 16:10 through 16:9 and a fitted portrait shell whose aspect flexes continuously from 9:16 through 10:16. It SHALL automatically select landscape on PC and portrait on mobile, independent of window shape. A PC-only developer override SHALL switch the complete shell between both aspects without changing gameplay state and SHALL not be available as a player preference.

#### Scenario: Render on mobile
- **WHEN** the game opens on a mobile platform
- **THEN** it uses a portrait shell fitted within the 9:16 through 10:16 range automatically

#### Scenario: Render on PC
- **WHEN** the game opens on a PC
- **THEN** it uses a landscape shell fitted within the 16:10 through 16:9 range automatically, including in a tall desktop window

#### Scenario: Use an intermediate fitted ratio
- **WHEN** the available surface ratio falls between the selected orientation's two endpoints
- **THEN** the fitted shell uses that intermediate ratio without changing campaign, time, camera, or Zoom

#### Scenario: Preview either aspect on PC
- **WHEN** a developer changes the Aspect setting on PC
- **THEN** the entire shell switches between its landscape and portrait ranges while campaign, time, camera, and Zoom stay unchanged

### Requirement: Size Command Desk landscape regions
The titlebar (1) and statusbar (2) SHALL each occupy 4% of shell height. Their contents SHALL be vertically centered. The middle SHALL contain the game view (3), secondary panel (4), and primary panel (5). At any supported landscape ratio, panels 4 and 5 SHALL each retain the CSS-pixel width they have in the 16:9 shell at the same shell height, and region 3 SHALL fill the remaining width after region boundaries and internal spacing.

#### Scenario: Resize landscape shell
- **WHEN** the fitted shell changes dimensions or uses any ratio from 16:10 through 16:9
- **THEN** the titlebar and statusbar retain their height percentages, each information column retains its height-relative CSS-pixel width, and the game view absorbs the remaining horizontal change without rescaling its tiles

### Requirement: Keep the portrait lower area available without tabs
Portrait SHALL use shell rows of 4% titlebar, 46% game view, 4% statusbar, and 46% bottom content at every supported portrait ratio. Titlebar and statusbar contents SHALL be vertically centered. The statusbar SHALL contain Control and Info buttons; the bottom SHALL show either the mobile controls or information panels according to that selection, with Control selected initially.

#### Scenario: Use a wider supported portrait shell
- **WHEN** a portrait shell uses any ratio from 9:16 through 10:16
- **THEN** the Title, Game, Status, Bottom-content order remains intact and the game view spans the current fitted shell width

#### Scenario: Scroll to mobile information
- **WHEN** the player scrolls the portrait lower area below the visible controls
- **THEN** both information panels are available without tabs or a change to game state, time, camera, or Zoom
