# Spec Delta

## MODIFIED Requirements

### Requirement: Keep static world data independent from visibility presentation
The game view SHALL preserve compiled static terrain across movement, viewport resize, zoom, discovery updates, illumination changes, and Render Test changes. Fog and lighting SHALL alter presentation independently without recalculating unchanged terrain or wall tile selection.

#### Scenario: Reframe an unchanged dungeon
- **WHEN** the player moves, the camera reframes, or the viewport zoom changes
- **THEN** visible world cells update without recalculating unchanged terrain or wall tile selection

#### Scenario: Apply existing discovery state
- **WHEN** the campaign's existing discovery data changes
- **THEN** presentation follows the current discovery rules without rebuilding unrelated static terrain

#### Scenario: Apply lighting or effect state
- **WHEN** illumination or an effect's enabled state changes
- **THEN** the affected presentation updates without rebuilding unrelated static terrain

### Requirement: Show a binary tactical area for detected enemies
During Battle, tactical dimming SHALL apply exactly two attenuation classes above scene lighting: tactical and non-tactical. Final scene colors can retain lighting variation within each class. The tactical area SHALL union a player-centered 3x3 region with filled inclusive rectangles to detected threats and the nearest clear-line threat, regardless of Perception. All regions SHALL extend one row upward for artwork. Overlap SHALL not increase brightness. Walls and closed doors SHALL block enemy-specific spatial hints. Tactical dimming SHALL take precedence over illumination without revealing fogged detail.

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

#### Scenario: Illuminate a non-tactical tile
- **WHEN** a torch or forward light illuminates terrain outside the tactical area
- **THEN** the final tactical overlay still attenuates that lit terrain using the non-tactical class
- **AND** scene lighting cannot brighten or bypass the tactical overlay

#### Scenario: Tactical rectangles cross unknown cells
- **WHEN** a tactical rectangle includes undiscovered cells while fog is enabled
- **THEN** those cells remain concealed and the tactical overlay exposes no terrain or object detail there

## ADDED Requirements

### Requirement: Compose exploration fog and illumination independently
Ordinary game rendering SHALL enable fog and lighting together by default. Enabled fog SHALL conceal undiscovered terrain and world details regardless of illumination. Revealed terrain SHALL retain its exploration state when light changes. The composition SHALL preserve world-depth order, pixel alignment, transparent artwork, and existing UI readability.

#### Scenario: Leave an explored corridor
- **WHEN** the player leaves a revealed corridor and its player-light contribution decreases
- **THEN** that corridor remains explored and receives its remaining ambient or environmental illumination

#### Scenario: Render an oversized actor near the fog boundary
- **WHEN** a permitted actor's artwork extends beyond its occupied cell
- **THEN** its visibility and tint follow its world anchor without a screen-aligned fog square cutting through the actor
- **AND** an actor on an undiscovered cell remains concealed

#### Scenario: Move the camera and resize
- **WHEN** camera mode, zoom, viewport size, fullscreen, or browser pixel density changes
- **THEN** fog and light remain attached to the same world cells without seams or stale masks

### Requirement: Apply exploration knowledge consistently in map views
The gameplay minimap and death recap SHALL show only discovered realm knowledge unless the gameplay minimap has an explicit fog-off Render Test override. The minimap SHALL retain semantic colors without scene-light flicker. The death recap SHALL always respect actual discovery. The Create World preview SHALL retain its intentional complete-map preview and SHALL NOT modify campaign discovery.

#### Scenario: Compare gameplay views
- **WHEN** enabled fog conceals an unexplored room in the game view
- **THEN** the gameplay minimap conceals the same room and its world markers

#### Scenario: Open the recap after a fog-off diagnostic
- **WHEN** the death recap opens after playing with Render Test fog disabled
- **THEN** it shows actual discovered knowledge rather than a diagnostic full-map reveal

#### Scenario: Preview a world before creation
- **WHEN** Create World displays its preview
- **THEN** the preview remains usable without gameplay fog or lighting and grants no discovery to the new campaign

### Requirement: Conceal identifying interactions in unknown cells
With fog enabled, hover and selection presentation SHALL NOT identify concealed objects, hazards or enemies through action-specific cursors, tooltips, tactical hints or route markers. Ordinary mouse walking SHALL be permitted to and through reachable fogged or dark cells with the same white reticle, white route dots and boot cursor as ordinary revealed-terrain walking. Exploration and illumination SHALL NOT clip the walking route. Normal travel limits, terrain/occupancy rules and collision SHALL remain authoritative. Concealed-target mouse selections SHALL carry walking intent only and SHALL NOT authorize attacks, pickups, bump interactions or other object actions. Exploration masking SHALL NOT change authoritative directional movement, pathfinding, enemy simulation or turn resolution.

#### Scenario: Hover an unknown cell
- **WHEN** the pointer selects an ordinary reachable walk destination in an undiscovered or dark cell
- **THEN** the white walking reticle, white route dots and boot cursor match ordinary revealed-terrain walking
- **AND** no concealed object, hazard or enemy identity is disclosed
- **AND** clicking that destination can start normal mouse travel

#### Scenario: Preview a route through unknown terrain
- **WHEN** a route to a reachable destination crosses undiscovered cells
- **THEN** its neutral white preview and automatic travel can continue across the discovery boundary within normal travel and collision limits
- **AND** this applies to both a revealed destination beyond unknown terrain and an unknown destination
- **AND** hovering or selecting the route does not grant discovery before accepted movement

#### Scenario: Select a concealed occupied cell
- **WHEN** a mouse destination contains a concealed enemy, pickup or interactive object
- **THEN** the selection carries walking intent under normal collision rules without identifying or activating the hidden contents
- **AND** it does not queue an attack, pickup or object interaction when the route later reveals those contents

#### Scenario: Preserve normal gameplay rules while walking through fog
- **WHEN** the player follows a mouse route into fogged or dark terrain
- **THEN** existing movement modes, terrain/occupancy constraints and turn rules continue to apply
- **AND** enemy detection, enemy simulation and directional-control behavior remain unchanged
