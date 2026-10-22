# Spec Delta

## ADDED Requirements

### Requirement: Keep Battle overlays screen-relative and readable
Battle presentation overlays SHALL be anchored to the main game-view viewport rather than world coordinates, SHALL remain stable during camera movement, and SHALL scale or constrain responsively so they do not block the central action area at supported viewport sizes or world Zoom levels.

#### Scenario: Move the camera during Battle
- **WHEN** the player or camera moves while Battle is active
- **THEN** the persistent crossed-swords icon remains attached to the upper-left viewport edge

#### Scenario: Use high world Zoom
- **WHEN** the player uses the highest supported world Zoom during Battle
- **THEN** the entry presentation and persistent icon remain readable without being positioned over the viewport center

#### Scenario: Use a compact viewport
- **WHEN** Battle is active in a compact supported viewport
- **THEN** the banner and icon remain within the game view without clipping or intercepting world input outside their own UI area
