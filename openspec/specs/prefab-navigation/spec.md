# prefab-navigation Specification

## Purpose
Defines how authored prefabs can either be embedded into generated dungeon floors or become standalone destinations entered through visible world teleport objects.

## Requirements

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

### Requirement: Enter and leave the player-home teleport prefab
Walking onto either member of the dungeon/home teleport-arrow pair SHALL transition the player between the active dungeon floor and the standalone player-home prefab through the iris effect.

#### Scenario: Enter the player home
- **WHEN** the player enters the dungeon teleport arrow configured for `player-home.tmx`
- **THEN** the iris closes, the active view changes to the player-home prefab, the player appears in a viable cardinal-adjacent cell to the home arrow, and the iris opens to reveal only the prefab

#### Scenario: Return from the player home
- **WHEN** the player enters the return arrow in `player-home.tmx`
- **THEN** the iris closes, the active view changes back to the originating dungeon floor, the player appears in a viable cardinal-adjacent cell to the originating dungeon arrow, and the iris opens to reveal only that floor

#### Scenario: Preserve dungeon identity during entry
- **WHEN** the player enters a teleport prefab
- **THEN** the dungeon level and world identity remain unchanged instead of advancing as they do for stairs

#### Scenario: Avoid a second turn
- **WHEN** either direction of the teleport-arrow pair is accepted
- **THEN** it does not advance dungeon time or run an additional enemy phase during the iris transition

### Requirement: Keep prefab navigation distinct from stair travel
Stair entry SHALL continue to change dungeon levels, while teleport-arrow entry SHALL use standalone prefab context without changing dungeon-floor progression.

#### Scenario: Compare stair and prefab entry
- **WHEN** the player enters stairs
- **THEN** the game performs the existing bidirectional dungeon-level transition
- **AND WHEN** the player enters a teleport arrow
- **THEN** the game performs the standalone prefab transition instead

### Requirement: Author paired arrows in both maps
The generated dungeon floor and `player-home.tmx` SHALL each contain one teleport arrow for the initial player-home use case.

#### Scenario: Explore the player home
- **WHEN** the player arrives in the player-home prefab
- **THEN** the player can move within its walkable footprint and can return only by entering its paired return arrow

### Requirement: Arrive beside, not on, teleport arrows
Teleport arrival SHALL select a viable cardinally adjacent cell that is walkable and unoccupied rather than placing the player on the destination arrow cell.

#### Scenario: Select a valid arrival cell
- **WHEN** a teleport completes
- **THEN** the player occupies one of the available north, south, east, or west neighboring cells of the destination arrow

#### Scenario: No valid arrival cell
- **WHEN** all cardinal neighbors of the destination arrow are blocked, occupied, or outside the map
- **THEN** the teleport is rejected without changing active map context or advancing time
