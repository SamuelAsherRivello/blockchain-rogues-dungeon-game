# mouse-path-navigation Specification

## Purpose
Defines route-aware mouse navigation so dungeon destinations can be reached around obstacles without bypassing turn-based movement rules.

## Requirements

### Requirement: Route a held mouse destination through cardinal cells
In General, one click SHALL follow the cardinal route or reachable approach through successive legal actions without requiring a held button, subject to the 30-step limit and trap courtesy stops. Gridless mouse travel SHALL snap to the occupied center before departing, move smoothly in whole pixels between route centers with looping run art and no hop/tween, and finish at the permitted endpoint's cell center. In Battle, one click SHALL request only the next legal cardinal step or adjacent interaction, subject to trap confirmation. Automatic travel SHALL stop on entering Battle, rejection, a world transition, a courtesy stop, its step limit, or exhausting its route; it SHALL not teleport across intermediate cells.

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

### Requirement: Preserve tactical obstacles and endpoint interactions
The route SHALL not traverse walls, enemy cells, barrels, campfires, or closed linked doors. Passable pickups SHALL remain traversable, with empty routes preferred. When the exact destination is blocked, a reachable approach SHALL remain available. A cardinally adjacent enemy, campfire, unopened chest/crate, or barrel SHALL retain its existing bump interaction when no approach step remains. Enterable endpoints SHALL retain their ordinary enter behavior.

#### Scenario: Target an enemy behind open terrain
- **WHEN** the player selects an enemy with a reachable approach
- **THEN** travel stops on reachable standing cells without entering the enemy cell
- **AND** the enemy's existing bump interaction remains available from a cardinally adjacent cell

#### Scenario: Target a stair or collectible
- **WHEN** the selected reachable endpoint contains a stair, potion, or item
- **THEN** next-step movement preserves that endpoint's enter behavior

#### Scenario: Target an unopened chest
- **WHEN** the selected endpoint is an unopened chest
- **THEN** its existing bump interaction remains available rather than forcing the player to stand inside the unopened object

#### Scenario: Approach a linked closed door
- **WHEN** a destination has an otherwise viable route through a closed linked door
- **THEN** the approach route ends before the first blocker without crossing the door

### Requirement: Communicate an unreachable mouse destination
The reticle SHALL prioritize enemy red and interactive green classifications over false exact reachability. Other unreachable targets and the player's own cell SHALL use nearly black. A false exact-reachability result SHALL not discard a reachable approach route or disable a legal adjacent interaction. With neither a next approach step nor a legal interaction, no movement or tactical time SHALL be requested.

#### Scenario: Select a sealed destination
- **WHEN** a non-interactive destination is impassable or isolated from the player
- **THEN** its reticle is nearly black
- **AND** any available approach route remains previewed and usable without entering blocked cells
- **AND** if no next approach step or adjacent interaction exists, player position, time, and enemy actions remain unchanged

#### Scenario: Route becomes unavailable
- **WHEN** the exact route becomes unavailable after the world changes
- **THEN** the reticle retains target-classification priority and the preview uses any available reachable approach before another movement is requested

#### Scenario: Enemy or interactive endpoint is blocked
- **WHEN** a selected enemy or green-classified interactive target has false exact reachability
- **THEN** its reticle remains red or green respectively

### Requirement: Display the existing mouse route as cell-center dots
The main view SHALL display centered dots for complete or approach route cells after the player's origin, up to 30 steps, except a selected green-classified interactive endpoint SHALL omit its dot. Trap cells SHALL use red dots, including a trap selected as the endpoint. Intermediate green-classified interactive cells SHALL use green dots; other dots SHALL use pale white. Previewing SHALL not move the player or advance time. The preview SHALL remain mouse-only. A preview through a trap SHALL not authorize uninterrupted movement across it.

#### Scenario: Hover an adjacent cardinal cell
- **WHEN** the mouse targets a reachable ordinary ground cardinal neighbor
- **THEN** exactly one dot appears at that neighbor's center

#### Scenario: Hover an adjacent diagonal cell
- **WHEN** the mouse targets a reachable ordinary ground diagonal neighbor using cardinal routing
- **THEN** two dots appear, one for each cardinal route step

#### Scenario: Hover a distant reachable cell
- **WHEN** a route exists around obstacles to an ordinary ground destination
- **THEN** dots follow that route toward the endpoint, excluding the origin and stopping after at most 30 route steps

#### Scenario: Selected green interactive endpoint
- **WHEN** the selected endpoint has the renderer's green interactive classification
- **THEN** its reticle remains visible but its endpoint dot is omitted

#### Scenario: Interactive object along the route
- **WHEN** an intermediate previewed cell has the green interactive classification
- **THEN** that cell has a green dot rather than a pale-white dot

#### Scenario: Preview an unreachable destination
- **WHEN** exact destination reachability is false but an approach route is returned
- **THEN** dots preview that approach after the origin, without implying that the reticle cell can be entered

### Requirement: Preserve the current reticle classification palette
The reticle SHALL use pale white #f5f1e6 for ordinary reachable ground, green #6dd873 for barrels and item/potion/key/gold/chest/campfire/stairs targets, red #dc3d40 for enemies and trap hazards, and nearly black #090909 for other invalid targets or the player's cell. Enemy, hazard, and green target classifications SHALL take priority over false exact reachability. These colors SHALL not themselves promise a successful interaction or bypass trap confirmation.

#### Scenario: Classify a campfire or barrel
- **WHEN** the mouse selects a campfire or barrel
- **THEN** its reticle is green even if an approach is needed

#### Scenario: Classify crates and discoveries
- **WHEN** the mouse selects a crate or discovery
- **THEN** it does not receive green classification solely because of that entity kind, and ordinary reachability/walkability classification applies

#### Scenario: Select the player's current cell
- **WHEN** the reticle selects the player's occupied cell
- **THEN** it uses nearly black rather than normal reachable-ground coloring

### Requirement: Keep route preview responsive and aligned
Pointer motion within the same target cell SHALL reuse navigation results while navigation inputs remain unchanged. Camera, Zoom, resize, and player motion SHALL keep dots aligned with their world cells. Dots SHALL be circular, ignore pointer input, and scale from 4 CSS pixels at native tile size. Held reticles SHALL stay on their selected world cell. Leaving hover SHALL clear its preview unless an active destination applies. The minimap SHALL not display route dots.

#### Scenario: Move within the selected cell
- **WHEN** only pointer pixels change inside the same world cell
- **THEN** navigation is not recomputed solely for those pointer pixels

#### Scenario: Reframe the world
- **WHEN** the camera, Zoom, or world-view dimensions change
- **THEN** dots remain centered on the same route cells

### Requirement: Limit mouse routes to thirty steps
Mouse previews and each click's travel SHALL be limited to 30 cardinal grid steps, excluding the origin. The limit SHALL count route steps rather than straight-line distance, remain fixed independently of attributes, Zoom, camera, viewport size, or panel visibility, and not reset during automatic route recomputation. Keyboard travel SHALL remain unchanged. Battle SHALL retain its stricter one-step input rule.

#### Scenario: Select a destination forty steps away
- **WHEN** an otherwise reachable target requires 40 route steps
- **THEN** the preview covers only the first 30 steps and reports false exact reachability for that click
- **AND** travel stops after at most 30 steps without resuming automatically

#### Scenario: Toggle information panels
- **WHEN** C changes panel visibility or the player changes Zoom or camera mode
- **THEN** the fixed 30-step route limit remains unchanged

### Requirement: Warn about traps without removing the preview beyond them
Trap cells SHALL remain traversable in the planned preview in every trap animation phase. Each previewed trap cell SHALL have a red dot using #dc3d40, while the route beyond it remains visible within the 30-step cap. Mouse movement SHALL stop at the safe cell center immediately before the first unconfirmed trap and cancel automatic continuation. A fresh second click from that stopping point toward the adjacent trap or beyond it SHALL permit crossing that trap only. Holding the original button SHALL not count as confirmation. Later traps SHALL each require another courtesy pause and fresh gesture. Keyboard movement SHALL remain able to enter traps deliberately and clear stale mouse confirmation. Closed doors SHALL remain blocked.

#### Scenario: Click beyond a trap
- **WHEN** a legal preview includes a trap before the selected destination
- **THEN** the trap dot is red and dots continue beyond it within the cap
- **AND** actual travel stops centered on the preceding safe cell without entering the trap

#### Scenario: Confirm crossing a warned trap
- **WHEN** a fresh second click targets the adjacent warned trap or a destination beyond it
- **THEN** travel may cross that trap under ordinary movement and damage rules
- **AND** another trap on the route causes a new courtesy stop

#### Scenario: First click while adjacent
- **WHEN** the first click requests entering an adjacent unconfirmed trap
- **THEN** the player remains in the safe cell and a second click is required to enter

#### Scenario: Select a trap itself
- **WHEN** the mouse targets a reachable trap cell
- **THEN** its endpoint dot and reticle are red and the same stop-and-confirm rule applies
