# Spec Delta

## ADDED Requirements

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
