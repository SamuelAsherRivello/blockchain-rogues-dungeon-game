# Spec Delta

## Purpose

Define sparse, deterministic Wang-based dungeon presentation that uses the verified tile roles for walkable boundaries, leaves unreachable blocked interiors empty, and exposes unsupported patterns during development.

## ADDED Requirements

### Requirement: Render walkable terrain from the verified Wang footprint
The game SHALL render every walkable cell as either the verified interior floor tile or the Wang tile assigned to that cell's complete eight-neighbor walkable mask.

#### Scenario: Render a supported room boundary
- **WHEN** a walkable cell has a mask represented by the verified dungeon mapping
- **THEN** the renderer uses the mapped local tile ID
- **AND** interior cells use local tile ID 13

### Requirement: Omit deep blocked interiors
The game SHALL omit tile sprites for blocked cells that do not touch a walkable cell by side or corner, allowing the game background to show through.

#### Scenario: Render an unreachable blocked region
- **WHEN** a blocked cell has no walkable neighbor in the eight surrounding positions
- **THEN** no terrain tile is placed at that cell
- **AND** the cell does not affect collision or pathfinding

### Requirement: Diagnose unsupported Wang patterns
The game SHALL omit a walkable boundary tile when its Wang mask is not in the verified mapping and SHALL display a semi-transparent red square at that cell in every world view.

#### Scenario: Encounter an unsupported boundary mask
- **WHEN** a walkable boundary cell has no verified local tile assignment
- **THEN** no dungeon tile is rendered at that cell
- **AND** a semi-transparent red 32-by-32 diagnostic square is rendered at the same world coordinate

### Requirement: Preserve simulation authority
Wang presentation SHALL not change the binary map, movement legality, entity coordinates, save data, or seeded floor generation.

#### Scenario: Compare presentation with simulation
- **WHEN** a floor is rendered with supported and unsupported Wang masks
- **THEN** collision and pathfinding continue to read the unchanged binary map
- **AND** the same seed produces the same map, entities, and diagnostic coordinates
