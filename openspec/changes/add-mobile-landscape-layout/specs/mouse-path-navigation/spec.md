# Spec Delta

## MODIFIED Requirements

### Requirement: Route a held mouse destination through cardinal cells
In General, one click SHALL follow a cardinal route through successive legal actions without requiring a held button, subject to the 30-step travel limit and the explicit-adjacent-click rule for traps and stairs. Gridless mouse travel SHALL snap to the occupied center before departing, move smoothly in whole pixels between route centers, and finish at the permitted endpoint's cell center. In Battle, one click SHALL request only the next legal cardinal step or adjacent interaction.

#### Scenario: Route around a wall
- **WHEN** a destination is reachable only by turning around impassable terrain
- **THEN** the next accepted mouse movement is the first cardinal step of a route around that terrain
- **AND** the player is not relocated directly to the destination

#### Scenario: Advance along a held route
- **WHEN** a reachable destination remains active after an accepted step in General
- **THEN** subsequent mouse movement recalculates from the player's current cell as needed and continues without requiring a held button
- **AND** every accepted discrete step remains one ordinary tactical action, with Gridless using its center-line turn accounting instead

#### Scenario: Battle limits the route
- **WHEN** the player clicks a distant reachable destination in Battle
- **THEN** only the next grid step is requested and a fresh click is required for another

### Requirement: Warn about traps without removing the preview beyond them
Mouse navigation SHALL NOT enter a trap or stair unless that tile is cardinally adjacent and the player explicitly clicks it. A route to another destination SHALL NOT cross a trap or stair. This rule applies to touch taps that invoke the same mouse action.

#### Scenario: Click beyond a trap
- **WHEN** a player clicks a destination beyond a trap
- **THEN** the route does not enter or cross the trap

#### Scenario: Confirm crossing a warned trap
- **WHEN** a player is cardinally adjacent to a trap and explicitly clicks the trap tile
- **THEN** the normal movement and trap rules may enter that tile

#### Scenario: First click while adjacent
- **WHEN** a player is cardinally adjacent to a trap and clicks a different tile beyond it
- **THEN** that click does not enter the trap

#### Scenario: Select a trap itself
- **WHEN** a player clicks a trap that is not cardinally adjacent
- **THEN** the trap is not entered by that click

#### Scenario: Select stairs
- **WHEN** a player clicks stairs
- **THEN** the stairs may be entered only if they are cardinally adjacent at the time of the click

### Requirement: Display the existing mouse route as cell-center dots
The main view SHALL display the current route or reachable approach as a connected path with a destination arrow. Previewing SHALL not move the player or advance time. The preview SHALL remain mouse-only and SHALL NOT display on the minimap.

#### Scenario: Hover an adjacent cardinal cell
- **WHEN** the mouse targets a reachable ordinary ground cardinal neighbor
- **THEN** the path connects the player to that neighbor

#### Scenario: Hover an adjacent diagonal cell
- **WHEN** the mouse targets a reachable ordinary ground diagonal neighbor using cardinal routing
- **THEN** the path shows both cardinal route steps

#### Scenario: Hover a distant reachable cell
- **WHEN** a route exists around obstacles to an ordinary ground destination
- **THEN** the path follows the route toward the endpoint

#### Scenario: Selected green interactive endpoint
- **WHEN** the selected endpoint has the renderer's green interactive classification
- **THEN** its reticle remains visible alongside the route

#### Scenario: Interactive object along the route
- **WHEN** a route passes a traversable interactive cell
- **THEN** the path remains aligned to the routed cells

#### Scenario: Preview an unreachable destination
- **WHEN** exact destination reachability is false but an approach route is returned
- **THEN** the path previews that approach without implying that the reticle cell can be entered

### Requirement: Keep route preview responsive and aligned
Pointer motion within the same target cell SHALL reuse navigation results while navigation inputs remain unchanged. Camera, Zoom, resize, and player motion SHALL keep the connected path aligned with its world cells. Held reticles SHALL stay on their selected world cell. Leaving hover SHALL clear its preview unless an active destination applies. The minimap SHALL not display the route path.

#### Scenario: Move within the selected cell
- **WHEN** only pointer pixels change inside the same world cell
- **THEN** navigation is not recomputed solely for those pointer pixels

#### Scenario: Reframe the world
- **WHEN** the camera, Zoom, or world-view dimensions change
- **THEN** the path remains aligned with the same route cells

### Requirement: Limit mouse routes to thirty steps
Each click's automatic travel SHALL be limited to 30 cardinal grid steps, excluding the origin. The limit SHALL count route steps rather than straight-line distance, remain fixed independently of attributes, Zoom, camera, viewport size, or panel visibility, and not reset during automatic route recomputation. A longer route may be previewed, but its exact destination SHALL report unreachable for that click.

#### Scenario: Select a destination forty steps away
- **WHEN** an otherwise reachable target requires 40 route steps
- **THEN** the full route may be previewed and exact reachability is false
- **AND** travel stops after at most 30 steps without resuming automatically

#### Scenario: Toggle information panels
- **WHEN** C changes panel visibility or the player changes Zoom or camera mode
- **THEN** the fixed 30-step route limit remains unchanged
