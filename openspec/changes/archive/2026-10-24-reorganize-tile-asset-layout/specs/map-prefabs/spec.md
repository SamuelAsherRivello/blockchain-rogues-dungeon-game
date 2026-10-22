# Spec Delta

## Purpose

Provide authored map fragments that runtime world generation can place as coherent locations while preserving the game's generated-map model. This capability begins with a prefab for the player's house.

## ADDED Requirements

### Requirement: Runtime prefabs are distinct from example maps
The game asset set SHALL identify authored map prefabs separately from non-runtime example maps, and a prefab SHALL be loadable as a runtime generation input.

#### Scenario: Discover the hero house prefab
- **WHEN** the runtime loads the available map-generation assets
- **THEN** it can resolve the hero house prefab from the prefabs collection
- **AND** it does not treat maps in the examples collection as runtime generation inputs

### Requirement: Prefab placement is conditional
The game SHALL select a prefab only when the active world-generation situation requires that authored location.

#### Scenario: Generate a floor that requires the player's house
- **WHEN** world generation determines that the player's house belongs on the floor
- **THEN** generation selects the hero house prefab
- **AND** the floor contains the prefab's authored layout rather than a randomized substitute for that location

### Requirement: Prefab stamping preserves authored map content
When a prefab is selected and placed at a valid location, the game SHALL copy its authored terrain, walkability, anchors or entrances, and authored objects into the generated map as one coherent fragment.

#### Scenario: Stamp the hero house into a generated floor
- **WHEN** the hero house prefab has a valid placement in the generated floor
- **THEN** its cells and authored objects are copied into the floor at one consistent origin
- **AND** its entrance and blocked-cell behavior remain consistent with the prefab definition

### Requirement: Invalid prefab placements do not corrupt generated maps
The game SHALL reject a prefab placement that exceeds the target map, conflicts with protected content, or violates the prefab's placement constraints before applying any part of the fragment.

#### Scenario: Candidate placement overlaps protected terrain
- **WHEN** a candidate hero house placement overlaps protected generated content
- **THEN** the candidate is rejected without partially stamping the prefab
- **AND** generation either chooses another valid placement or reports that the required prefab could not be placed
