# Spec Delta

## Purpose

Defines a portable Tiled map contract that separates walkable ground, rendered nonwalkable walls, pickups, and decorations so repaired maps can be validated and reused without relying on ambiguous layer names or tile IDs.

## ADDED Requirements

### Requirement: Export the canonical layer contract
The repair map SHALL contain tile layers named `Grounds` and `Walls`, plus object layers named `Pickups` and `Decorations`.

#### Scenario: Inspect an exported repair map
- **WHEN** a generated floor is exported for Tiled editing
- **THEN** the map contains the four canonical layers with the declared layer types

### Requirement: Use grounds and walls as separate map roles
Tiles in `Grounds` SHALL represent walkable floor cells. Tiles in `Walls` SHALL represent nonwalkable wall cells. A cell with neither layer populated SHALL remain empty background space.

#### Scenario: Resolve collision from repaired layers
- **WHEN** a repaired map is imported
- **THEN** a cell populated in `Grounds` is walkable, a cell populated in `Walls` is blocked, and an empty cell remains unrendered unless required by an existing room or entity constraint

### Requirement: Preserve object layer meaning
`Pickups` SHALL contain pickup or loot placements, and `Decorations` SHALL contain non-pickup map objects and static markers without changing the gameplay authority of the active floor.

#### Scenario: Import repaired object layers
- **WHEN** a repaired map contains objects in `Pickups` or `Decorations`
- **THEN** the importer preserves recognized placements, rejects malformed required markers, and leaves dynamic actor simulation under game-state control

### Requirement: Validate the canonical layer schema
The repair validator SHALL reject maps missing any canonical layer, using the wrong layer type, or placing a cell in both `Grounds` and `Walls`.

#### Scenario: Reject ambiguous layer data
- **WHEN** a repair map has overlapping ground and wall cells or legacy ambiguous layer names without an explicit migration form
- **THEN** import fails with a layer-schema error and the active floor remains unchanged
