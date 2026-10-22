# map-discovery Specification

## Purpose
Track the dungeon knowledge a character earns, hide undiscovered areas in both map views, and make that knowledge available to recovery and recap presentation.

## Requirements

### Requirement: Reveal dungeon knowledge through exploration
Each new Dungeon Level SHALL start with undiscovered map knowledge except for the player's initial revealed area. Moving and other documented discovery actions SHALL reveal cells around the player without modifying terrain, entity simulation, or tactical time solely to reveal them.

#### Scenario: Discover a new area
- **WHEN** the player enters an unrevealed reachable area
- **THEN** its documented cells become visible in the game view and minimap

### Requirement: Preserve and report discovered coverage
The campaign SHALL persist discovered cells for each visited Dungeon Level and derive a percentage of the active level that has been discovered. The percentage SHALL be available to the death recap without revealing undiscovered cells.

#### Scenario: Resume exploration
- **WHEN** a player saves and reloads after discovering part of a level
- **THEN** the same cells remain revealed and the coverage percentage remains consistent

### Requirement: Apply discovery to recovery state
Adventure recovery SHALL restore the active level with fresh undiscovered map knowledge. Journey recovery SHALL restore the discovered-map state captured at its checkpoint. Classic SHALL not create recovery state after death.

#### Scenario: Reset Adventure map knowledge
- **WHEN** an Adventure campaign restarts a level after death
- **THEN** prior exploration of that level is no longer revealed
