# Spec Delta

## Purpose

Defines deterministic room-to-room corridors whose width is explicit, whose endpoints use safe room sockets, and whose visible borders remain continuous wherever corridor ground meets nonwalkable space.

## ADDED Requirements

### Requirement: Generate corridors with an explicit width
Each horizontal or vertical corridor SHALL have an integer width of at least one tile, measured perpendicular to its travel direction.

#### Scenario: Generate a one-wide corridor
- **WHEN** a corridor width of one is selected
- **THEN** the corridor contains one continuous row or column of walkable ground

#### Scenario: Generate a wider corridor
- **WHEN** a corridor width greater than one is selected
- **THEN** the corridor contains that many adjacent walkable rows or columns along its traversed length

### Requirement: Connect through non-corner room sockets
Corridor endpoints SHALL enter a room through a floor socket at least one tile away from every room corner, and SHALL not terminate against a room corner.

#### Scenario: Connect a corridor to a rectangular room
- **WHEN** a corridor is attached to a room boundary
- **THEN** the opening is placed on a valid non-corner boundary segment and the room remains connected to the corridor

### Requirement: Render a wall at every exposed corridor boundary
For each corridor ground cell adjacent orthogonally to nonwalkable space, the map SHALL contain a rendered wall boundary on that exposed side, except where the side is an intentional room opening or corridor intersection.

#### Scenario: Render a one-wide corridor boundary
- **WHEN** a one-wide corridor crosses empty nonwalkable space
- **THEN** its top and bottom boundaries render as walls for a horizontal corridor, or its left and right boundaries render as walls for a vertical corridor

#### Scenario: Render a wider corridor boundary
- **WHEN** a corridor has width two or greater
- **THEN** only the outer sides of the complete ground band receive walls, preserving all interior ground cells as walkable

### Requirement: Preserve wall continuity around bends and intersections
Wang corner and junction roles SHALL keep walls continuous around corridor bends and SHALL leave deliberate openings at room connections and corridor intersections.

#### Scenario: Bend a corridor
- **WHEN** a corridor changes direction
- **THEN** its outside corner, inside corner, and exposed sides render without a gap or wall crossing the ground path

### Requirement: Keep deep unreachable space empty
The generator SHALL leave nonwalkable cells that are not part of a rendered room or corridor wall boundary empty so the game background shows through.

#### Scenario: Render a sparse dungeon
- **WHEN** a generated floor contains unreachable space far from any ground cell
- **THEN** that space has no wall or ground tile
