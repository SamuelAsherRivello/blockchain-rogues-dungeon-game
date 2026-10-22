# Spec Delta

## ADDED Requirements

### Requirement: Render an explicitly loaded repair map consistently
When a validated repaired map is active, the game view and minimap SHALL derive terrain, actors, objects, player, and exit coordinates from that same repaired map while retaining their independent camera and scale behavior.

#### Scenario: Compare repaired game and minimap views
- **WHEN** a repaired map is loaded in map-fix mode
- **THEN** the game and minimap show matching world coordinates for all shared cells and entities

#### Scenario: Return to generated gameplay
- **WHEN** the repaired-map session ends or the map-fix URL is removed
- **THEN** ordinary generated-floor rendering resumes without stale repaired terrain or diagnostics
