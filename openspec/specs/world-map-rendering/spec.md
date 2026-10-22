# world-map-rendering Specification

## Purpose
Render the game view and minimap from the same world geometry with selectable camera behavior and independent presentation arguments.

## Requirements

### Requirement: Keep static world data independent from visibility presentation
The game view SHALL preserve compiled static terrain across movement, viewport resize, zoom, and updates to existing discovery data. This change SHALL preserve the current discovery rules without introducing new fog or lighting behavior.

#### Scenario: Reframe an unchanged dungeon
- **WHEN** the player moves, the camera reframes, or the viewport zoom changes
- **THEN** visible world cells update without recalculating unchanged terrain or wall tile selection

#### Scenario: Apply existing discovery state
- **WHEN** the campaign's existing discovery data changes
- **THEN** presentation follows the current discovery rules without rebuilding unrelated static terrain

### Requirement: Render the minimap with semantic cell markers
The minimap SHALL use colored dots for terrain, walls, and key world objects, with no PNG assets or gameplay sprite atlases. It SHALL preserve the current full-realm fit, passive interaction, matching world coordinates, and shared interpolated mover positions.

#### Scenario: Display a populated floor
- **WHEN** the minimap renders terrain, walls, the player, exit, pickups, and enemies
- **THEN** it shows their matching coordinates using semantic markers without loading their game-view sprite artwork

#### Scenario: Move a character or barrel
- **WHEN** a player, visible enemy, or pushed barrel moves between grid positions
- **THEN** its dot follows the shared presented coordinate while the minimap's framing stays independent of game zoom and camera

### Requirement: Retain minimap terrain during marker movement
The minimap SHALL retain its unchanged terrain background while moving dots update independently. Marker-only motion SHALL NOT regenerate or upload the complete static map, and a hidden minimap SHALL perform no presentation work.

#### Scenario: Walk through unchanged terrain
- **WHEN** only the player's presented position changes
- **THEN** the player dot moves without repainting or uploading the static map

#### Scenario: Hide and restore the minimap
- **WHEN** the minimap is hidden and later shown
- **THEN** it resumes at the current realm and mover positions without doing hidden presentation updates

### Requirement: Keep world views geometrically consistent
The game view and minimap SHALL derive terrain, walls, object coordinates, actor coordinates, linked puzzle-object states, and discovered-map visibility from the same active realm. During sub-grid movement presentation, both views SHALL use the same interpolated player, actor, and pushable-barrel coordinates. The player marker SHALL use the Hero Warrior actor's logical grid coordinate in both views even when the game view renders an oversized animated frame. The game-view camera SHALL frame from the interpolated player coordinate in Center, Deadzone, and Screen modes while retaining each mode's existing framing policy. The minimap SHALL provide a simplified low-resolution representation of discovered realm knowledge rather than unrelated artwork. Generated levels, exported editable maps, and repaired maps SHALL use one canonical Grounds and Walls tile-layer result for their visible terrain. Both views SHALL consume identical sparse Wang terrain and diagnostic-cell coordinates; deep blocked interiors remain omitted, and diagnostics are visible only through explicit developer opt-in.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** walkable cells, Wang boundary cells, red diagnostic cells, player, and exit occupy matching map coordinates despite different scale and detail

#### Scenario: Show a corridor boundary consistently
- **WHEN** a corridor floor meets nonwalkable space
- **THEN** the game view and minimap show the same wall boundary at the same world coordinates

#### Scenario: Present character movement
- **WHEN** a player or visible enemy travels between committed grid cells
- **THEN** the game view and minimap show that character at the same interpolated coordinate throughout the movement

#### Scenario: Stage enemy movement
- **WHEN** a resolved turn is presenting a visible enemy movement
- **THEN** the game view and minimap show that enemy at the same interpolated coordinate throughout its movement

#### Scenario: Retarget character movement
- **WHEN** a later accepted action changes a character's destination before its movement ends
- **THEN** both views show the same new interpolation from the character's current displayed coordinate

#### Scenario: Follow interpolated player movement
- **WHEN** the player moves or retargets during a 250 millisecond movement presentation
- **THEN** Center, Deadzone, and Screen camera modes each frame from the player's current interpolated coordinate while preserving their established centering, deadzone, or screen-page behavior

#### Scenario: Show a linked puzzle set
- **WHEN** both views render a Floor Trigger Door Barrel Set
- **THEN** the barrel, floor trigger, and door occupy matching map coordinates in both views
- **AND** each view distinguishes active from inactive trigger and open from closed door states

#### Scenario: Interpolate a pushed barrel
- **WHEN** a player pushes a barrel between committed grid cells
- **THEN** the game view and minimap show that barrel at the same interpolated coordinate throughout its 250 millisecond movement
- **AND** the trigger and door update their state from the committed object-set position

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale sparse terrain, diagnostic cells, or actors

#### Scenario: Enter a standalone prefab
- **WHEN** the player enters a teleport prefab and its iris transition completes
- **THEN** both views render the prefab's terrain and player from the same active prefab context with no stale dungeon-floor geometry

#### Scenario: Hide an undiscovered region
- **WHEN** part of the active realm has not been discovered
- **THEN** neither the game view nor minimap exposes its terrain, objects, or enemies through ordinary play presentation

#### Scenario: Render a generated level and its editable copy
- **WHEN** a generated level is rendered in the game and exported as an editable Tiled map
- **THEN** the same walkable cells and wall cells appear in both representations, Walls use the same resolved frames, and Grounds uses the single approved walkable tile

#### Scenario: Resolve an authored repaired map
- **WHEN** a repaired map supplies valid Grounds and Walls layers
- **THEN** runtime rendering preserves those authored tile frames while using the same coordinates and semantic walkability

#### Scenario: Animate the player while the minimap is visible
- **WHEN** the Hero Warrior advances through idle or another selected animation
- **THEN** the game view updates its frame while the minimap continues to show one player marker at the unchanged logical cell

### Requirement: Center camera follows every move
Center mode SHALL keep the player's sprite center at the game view's center, moving the displayed world as the player moves. Center SHALL be the default camera mode without a saved preference.

#### Scenario: Move while Center is selected
- **WHEN** the player moves one row or column
- **THEN** the player remains centered and the world shifts by that step

### Requirement: Deadzone camera permits local movement
Deadzone mode SHALL allow the player to move freely within a centered rectangle covering 30% of the visible game-view width and 30% of its height without moving the world. When the player crosses that boundary, the camera SHALL scroll enough to keep the player within the deadzone. The rectangle SHALL be recalculated from the visible world span when Zoom or viewport size changes.

#### Scenario: Move inside deadzone
- **WHEN** the player moves without crossing a deadzone boundary
- **THEN** the camera remains stationary

#### Scenario: Cross deadzone boundary
- **WHEN** a move takes the player beyond the centered rectangle
- **THEN** the world shifts just enough to bring the player back to the centered 30%-by-30% deadzone

#### Scenario: Resize or zoom in Deadzone mode
- **WHEN** visible world width or height changes while Deadzone is selected
- **THEN** the centered deadzone adjusts to 30% of the new visible width and height without changing the player's world coordinates

### Requirement: Screen camera advances by view pages
Screen mode SHALL keep the current view stationary until the player exits an edge, then display the adjoining full screen so the player enters its opposite edge. Paging SHALL change presentation without teleporting, wrapping, or duplicating the player's world position.

#### Scenario: Exit right or left
- **WHEN** the player exits the right or left edge
- **THEN** the adjoining screen appears and the player enters at its left or right edge respectively

#### Scenario: Exit top or bottom
- **WHEN** the player exits the top or bottom edge
- **THEN** the adjoining screen appears and the player enters at its bottom or top edge respectively

### Requirement: Minimap framing is independent of game camera
The minimap SHALL fit the active realm at low resolution with a player marker. Changing game Zoom or Camera SHALL not change the map geometry or the minimap's full-realm framing.

#### Scenario: Change game zoom
- **WHEN** the player changes game Zoom from 1 to 2
- **THEN** the game shows fewer cells while the minimap continues to fit the same entire realm

### Requirement: Restrict mouse interaction to the game view
Only the main game view SHALL handle mouse selection, reticle rendering, movement input, and mouse-wheel Zoom. The minimap SHALL remain a passive renderer with mouse interaction disabled.

#### Scenario: Move the pointer over the minimap
- **WHEN** the pointer moves or clicks over the minimap
- **THEN** no game reticle or movement input appears or is triggered

### Requirement: Retain a selected world cell while the mouse is held
When a mouse button is pressed over the game view, the selected grid cell SHALL remain the same world coordinate until release. The renderer SHALL reproject that cell through the active camera and Zoom so the reticle stays on it while the player or camera moves. Pointer movement during the hold SHALL NOT select a different cell. After release, normal hover selection SHALL resume.

#### Scenario: Hold selection while the camera moves
- **WHEN** the player holds the mouse over a selected cell while movement shifts the view
- **THEN** the reticle follows the same world cell as its screen position changes

#### Scenario: Hold selection in each camera mode
- **WHEN** the mouse is held while Center, Deadzone, or Screen camera framing changes
- **THEN** the reticle remains aligned to the selected world cell in every mode

#### Scenario: Release held selection
- **WHEN** the mouse button is released
- **THEN** the held world-cell selection ends and later pointer movement selects by its current grid position

### Requirement: Keep game cameras within map bounds
When the active dungeon map is at least as large as the visible world span on both axes, Center, Deadzone, and Screen cameras SHALL frame only cells within the active dungeon map. If centering the player would reveal space beyond a map edge, the camera SHALL clamp to the map bounds and the player MAY appear away from the viewport center.

#### Scenario: Follow the player near an edge
- **WHEN** a player moves near an outer map edge in Center mode
- **THEN** the view contains map tiles rather than renderer clear space when the map covers the visible span
- **AND** the player shifts from the viewport center only as needed to keep the view within map bounds

#### Scenario: Change camera mode near an edge
- **WHEN** a player switches among Center, Deadzone, and Screen near an outer map edge
- **THEN** the selected camera behavior is applied without displaying coordinates beyond the active map

### Requirement: Apply the selected camera mode live
The game SHALL apply the selected persisted camera mode immediately and recompute its framing whenever the game viewport, layout, browser zoom or device-pixel-ratio, world zoom, or camera mode changes. Center and Deadzone SHALL reinitialize around the player; Screen SHALL select the page containing the player.

#### Scenario: Change the selected camera
- **WHEN** the player chooses a different camera mode while playing
- **THEN** the game view uses that mode on the next render without remounting the game or changing player coordinates

#### Scenario: Reconfigure the game view
- **WHEN** the game viewport or world zoom changes
- **THEN** the current camera mode is reapplied using the new visible world span
- **AND** the player is recentered when the selected mode and map bounds permit it

### Requirement: Keep camera modes independent from the minimap
Changing a game-camera mode or its framing SHALL NOT change minimap geometry or prevent the minimap from fitting the active dungeon.

#### Scenario: Reframe the game camera
- **WHEN** the main game camera is resized or switched
- **THEN** the minimap continues to show the same full active map and player coordinate

### Requirement: Order world visuals through defined render passes
The game view SHALL render walkable terrain first and floor-attached decals second. Walls, props, pickups, stairs, teleport arrows, barrels, enemies, and the player SHALL use the shared world-depth pass without a fixed sprite layer overriding their depth. The minimap SHALL derive matching world coordinates and mover positions without adopting game-view occlusion behavior.

#### Scenario: Draw a floor trigger under a barrel
- **WHEN** an active floor trigger and its barrel share one tile
- **THEN** the trigger renders above walkable terrain and below the barrel, wall tiles, and characters

#### Scenario: Render matching world positions in both views
- **WHEN** the game view and minimap render a floor containing walls, a player, enemies, a barrel, and a teleport arrow
- **THEN** both views use the same world coordinates and presented mover positions for those entries

#### Scenario: Draw a floor beside a wall
- **WHEN** a wall tile and an adjacent walkable floor tile are visible
- **THEN** the floor remains behind the wall art without changing the depth order of a prop or character at that boundary

#### Scenario: Keep rule selection authoritative
- **WHEN** a terrain cell is rendered from a generated or fixture map
- **THEN** its local tile ID comes from the validated `tileset-dungeon.tsx` rule contract
- **AND** an unsupported signature produces the shared diagnostic behavior instead of a nearest-frame substitution
- **AND** supported production maps contain zero unresolved signatures and display no diagnostic overlays

### Requirement: Sort shared world visuals by ground-contact depth
The shared world-depth pass SHALL order each visual by its ground-contact pixel Y coordinate. Walls SHALL use their front edge. Entries with the same Y coordinate SHALL use a deterministic tie-break, and a composite entity's shadow SHALL render immediately before its main sprite.

#### Scenario: Pass a character south of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position south of a wall's front edge
- **THEN** that entity renders in front of the wall

#### Scenario: Pass a character north of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position north of a wall's front edge
- **THEN** the wall renders in front of that entity

#### Scenario: Order an object at a wall boundary
- **WHEN** a pickup, chest, door, torch, stair, or particle shares a ground-contact Y coordinate with a wall
- **THEN** the deterministic tie-break produces the same visible order on every frame

#### Scenario: Move an entity with a shadow
- **WHEN** a player, rat, skeleton, or barrel is visible while stationary or moving between grid cells
- **THEN** its shadow and main sprite use the same presented position and the shadow renders directly beneath its main sprite

### Requirement: Preserve explicit depth exceptions
Walkable terrain, floor-attached decals, screen-space UI and diagnostics, and effects with an explicitly documented owner-relative depth SHALL NOT enter the shared world-depth sort. An owner-relative effect SHALL retain its declared position above or below its owner regardless of unrelated world Y positions.

#### Scenario: Render a player heal effect
- **WHEN** the player Heal effect is active near another world visual with a different Y coordinate
- **THEN** the effect remains at its documented depth above the player

#### Scenario: Render the targeting reticle
- **WHEN** the player points at a visible game-view cell
- **THEN** the reticle remains a screen-space overlay and does not change world-visual ordering

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

### Requirement: Show a binary tactical area for detected enemies
During Battle, the game view SHALL have exactly two brightness zones. The tactical area SHALL union a player-centered 3x3 region with filled inclusive rectangles to detected threats and the nearest clear-line threat, regardless of Perception. All regions SHALL extend one row upward for artwork. Overlap SHALL not increase brightness. Walls and closed doors SHALL block enemy-specific spatial hints.

#### Scenario: One detected enemy
- **WHEN** Battle is active with one detected qualifying enemy
- **THEN** the player cell, enemy cell, and rectilinear engagement area between them belong to the tactical area
- **AND** one full row above the rectangle is included to protect character artwork
- **AND** cells outside the union with the minimum player focus belong to the non-tactical area

#### Scenario: Multiple detected enemies
- **WHEN** Battle is active with multiple detected qualifying enemies
- **THEN** the tactical area is the union of each player-to-enemy engagement area
- **AND** overlapping areas are rendered as one combined tactical area

#### Scenario: No detected enemy
- **WHEN** Battle is active but all qualifying enemies are concealed by walls or closed doors
- **THEN** no enemy-specific tactical area is shown
- **AND** the player-centered 3x3 area plus one row above remains highlighted
- **AND** the presentation does not reveal hidden enemy location information

### Requirement: Preserve world geometry and interaction
The tactical-area presentation SHALL be a visual overlay over the existing world rendering and SHALL not change terrain geometry, camera coordinates, minimap geometry, collision, route selection, reticles, or pointer input.

#### Scenario: Interact inside tactical area
- **WHEN** the player moves or selects a cell within the tactical area
- **THEN** existing movement, combat, and mouse interaction rules remain unchanged

#### Scenario: Reframe or zoom the world
- **WHEN** the camera or world Zoom changes during Battle
- **THEN** the tactical area reprojects from the same world coordinates without changing its membership

### Requirement: Render dropped object flights and settled sprites
The world renderer SHALL draw dropped equipment, abilities, consumables, and capacity items during their parabolic flight and after they settle, using the same world-depth ordering and visibility rules as other pickups.

#### Scenario: Render a dropped weapon
- **WHEN** a weapon is thrown from the player to an adjacent cell
- **THEN** its item-specific sprite follows the arc and then remains visible at the settled cell

#### Scenario: Render a dropped ability
- **WHEN** an ability is present in the world
- **THEN** its distinct representation is visible in both the game view and minimap at matching coordinates

### Requirement: Keep Wang presentation consistent across views
The game view and minimap SHALL consume the same resolved Wang role, local tile identity, and unsupported-topology diagnostic for each world coordinate.

#### Scenario: Compare a corner and side mapping
- **WHEN** a seeded fixture contains the corrected corner and repeated side roles
- **THEN** both views show the same tile-role identity at the same coordinate, scaled only by their view policy

### Requirement: Present only production dungeon artwork
The production game view and minimap SHALL contain no temporary diagnostic text, red unsupported-cell markers, construction grids, pivot markers, or guidelines. Supported dungeon boundaries SHALL remain complete and coherent. Diagnostic visualization SHALL require explicit developer opt-in.

#### Scenario: Open the normal dungeon route
- **WHEN** a supported seeded floor opens without debug query flags
- **THEN** the dungeon displays production atlas tiles with continuous walls, correct corners and joins, and no temporary overlays
- **AND** suppressing diagnostics without resolving missing tile roles does not satisfy acceptance

### Requirement: Render ranged combat actors and projectiles
The world view SHALL render a Skeleton Archer and each transient ranged projectile above terrain and below persistent interface content. A projectile SHALL travel from its source to the resolved target before its feedback appears.

#### Scenario: Render an arrow
- **WHEN** a Skeleton Archer fires at the player
- **THEN** an arrow appears along its cardinal travel path before the hit feedback

### Requirement: Render a read-only minimap recap
The game SHALL render the active discovered-map state as a passive, read-only minimap image in the death recap without enabling map input or changing active-camera framing.

#### Scenario: Inspect the fatal map
- **WHEN** a death recap is visible
- **THEN** it shows the discovered portion of the fatal level without accepting minimap interaction

### Requirement: Render an explicitly loaded repair map consistently
When a validated repaired map is active, the game view and minimap SHALL derive terrain, actors, objects, player, and exit coordinates from that same repaired map while retaining their independent camera and scale behavior.

#### Scenario: Compare repaired game and minimap views
- **WHEN** a repaired map is loaded in map-fix mode
- **THEN** the game and minimap show matching world coordinates for all shared cells and entities

#### Scenario: Return to generated gameplay
- **WHEN** the repaired-map session ends or the map-fix URL is removed
- **THEN** ordinary generated-floor rendering resumes without stale repaired terrain or diagnostics
