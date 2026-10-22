# Spec Delta

## Purpose

Defines how authored prefabs can either be embedded into generated dungeon floors or become standalone destinations entered through visible world teleport objects.

## ADDED Requirements

### Requirement: Stamp prefabs into generated floors
World generation SHALL be able to place a validated authored prefab into an existing dungeon floor without changing the active realm.

#### Scenario: Stamp a valid prefab
- **WHEN** generation selects a legal origin for a stamp prefab
- **THEN** the prefab footprint is applied to the floor, protected cells are preserved, and the generated walkable route connects to its entrance

#### Scenario: Reject an invalid stamp
- **WHEN** a prefab footprint overlaps protected or occupied cells or extends beyond the floor
- **THEN** generation rejects that placement without partially modifying the floor

### Requirement: Generate teleport-arrow entry objects
Each generated dungeon level SHALL contain one legal teleport-arrow object that is separate from terrain and rendered above the floor.

#### Scenario: Generate the normal placement
- **WHEN** a level is generated without the level-test setting
- **THEN** exactly one teleport-arrow object is placed at a deterministic pseudo-random legal walkable position on that level

#### Scenario: Generate the level-test placement
- **WHEN** `leveltest=1` is enabled in developer settings for World 1, Level 1
- **THEN** exactly one teleport-arrow object is placed within 50 grid cells of the floor's starting point

#### Scenario: Preserve placement legality
- **WHEN** the teleport-arrow position is selected
- **THEN** it does not overlap stairs, required entrances, blocked terrain, occupied entities, or protected stamp cells

### Requirement: Display teleport arrows as world objects
The teleport arrow SHALL use a dedicated object-layer representation with a temporary visual showing arrows pointing up, down, left, and right around its grid cell.

#### Scenario: Render an arrow object
- **WHEN** a generated floor containing a teleport-arrow is rendered
- **THEN** the four-direction arrow visual appears above the floor and participates in normal world-object depth ordering

### Requirement: Enter a standalone teleport prefab
Walking onto a teleport-arrow object SHALL transition the player into its configured standalone prefab destination through the iris effect.

#### Scenario: Enter the player home
- **WHEN** the player enters the World 1, Level 1 teleport arrow configured for `player-home.tmx`
- **THEN** the iris closes, the active view changes to the player-home prefab, the player appears at its authored entrance, and the iris opens to reveal only the prefab

#### Scenario: Preserve dungeon identity during entry
- **WHEN** the player enters a teleport prefab
- **THEN** the dungeon level and world identity remain unchanged instead of advancing as they do for stairs

#### Scenario: Avoid a second turn
- **WHEN** a teleport-arrow entry is accepted
- **THEN** it does not advance dungeon time or run an additional enemy phase during the iris transition

### Requirement: Keep prefab navigation distinct from stair travel
Stair entry SHALL continue to change dungeon levels, while teleport-arrow entry SHALL use standalone prefab context without changing dungeon-floor progression.

#### Scenario: Compare stair and prefab entry
- **WHEN** the player enters stairs
- **THEN** the game performs the existing bidirectional dungeon-level transition
- **AND WHEN** the player enters a teleport arrow
- **THEN** the game performs the standalone prefab transition instead

### Requirement: Defer prefab return travel
The initial teleport-prefab release SHALL support entry into the player home but SHALL NOT require a return trigger or return transition.

#### Scenario: Explore the player home
- **WHEN** the player arrives in the player-home prefab
- **THEN** the player can move within its walkable footprint without automatically returning to the dungeon

