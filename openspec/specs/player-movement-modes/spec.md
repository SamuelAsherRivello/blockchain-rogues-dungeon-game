# player-movement-modes Specification

## Purpose

Define selectable player movement with precise pixel positions, single-cell occupancy, and predictable tactical time.

## Requirements

### Requirement: Select a movement mode
The game SHALL offer Grid-snap, Grid-tween, and Gridless, defaulting to Grid-tween. Selecting a mode SHALL cancel pending travel without advancing time and SHALL retain the selected mode independently of temporary Battle behavior.

#### Scenario: Select Grid-snap
- **WHEN** the player selects Grid-snap and submits an accepted grid movement
- **THEN** the player appears immediately at the destination cell center

#### Scenario: Select Grid-tween
- **WHEN** the player selects Grid-tween and submits an accepted grid movement
- **THEN** the player travels to the destination cell center over 250 milliseconds

### Requirement: Maintain one occupied cell during pixel movement
In General game mode with Gridless selected, the player SHALL move and stop on whole world pixels and SHALL occupy exactly one grid cell at every position. Cell ownership SHALL follow the containing cell under a fixed boundary rule. Collision, targeting, and triggers SHALL use that ownership rather than treating the player as occupying two cells.

#### Scenario: Stop off center
- **WHEN** Gridless input stops between cell centers
- **THEN** the player remains at a whole-pixel position inside exactly one cell

#### Scenario: Encounter a wall before a center line
- **WHEN** a pixel step would enter blocked terrain
- **THEN** the player does not enter that cell even if no turn-producing center line has been crossed

### Requirement: Count gridless center-line crossings independently
Gridless travel in General SHALL advance one tactical turn for each column-center line crossed and one for each row-center line crossed. Crossings SHALL resolve in travel order with deterministic X-before-Y ordering for simultaneous crossings. Stationary positions and the starting center SHALL not produce ticks.

#### Scenario: Move horizontally through three centers
- **WHEN** the player crosses three new column-center lines without crossing a row-center line
- **THEN** time advances three turns and enemy eligibility is evaluated once per turn

#### Scenario: Cross diagonally at a center intersection
- **WHEN** a legal segment crosses a column-center and row-center at the same instant
- **THEN** the column event and then the row event each advance one turn, subject to interruption after the first

#### Scenario: Cross slightly off diagonal
- **WHEN** the player crosses the column-center line shortly before the row-center line
- **THEN** two distinct turns resolve in that order

#### Scenario: Stop and resume on a line
- **WHEN** the player stops exactly on a counted center line and resumes in the same direction
- **THEN** that line is not counted again

#### Scenario: Interrupted multi-crossing movement
- **WHEN** death, floor transition, or a new blocker interrupts a movement segment
- **THEN** untraveled crossings do not advance time or affect a replacement floor

### Requirement: Share precise positions across world views
The main view, minimap, and camera SHALL use the same precise player position in every movement mode. Gridless motion SHALL remain independent of display frame rate and selected Zoom.

#### Scenario: Change Zoom during free movement
- **WHEN** Zoom changes during Gridless movement
- **THEN** whole world-pixel position, occupied cell, and counted crossings remain unchanged by Zoom itself

### Requirement: Complete a clicked destination in General
In General, one click on a reachable destination SHALL travel the legal route using the selected movement mode without requiring a held mouse button, subject to a fixed 30-cardinal-step limit and a courtesy stop before each unconfirmed trap. All mouse movement modes SHALL finish at the permitted endpoint's cell center. Gridless mouse travel SHALL first snap to the occupied cell center without adding time, then follow the route smoothly in whole pixels with the directional run animation and no hopping or positional tween. A fresh second click from a pre-trap stop SHALL permit crossing that adjacent trap, without bypassing another trap or the per-click limit. Keyboard Gridless travel SHALL continue to allow free whole-pixel stops, unaffected by the mouse limit or courtesy rule. Entering Battle SHALL interrupt automatic continuation.

#### Scenario: Click a distant destination in each movement mode
- **WHEN** the player clicks and releases on a reachable distant destination in General
- **THEN** Grid-snap advances accepted cells instantly, Grid-tween animates accepted steps, and Gridless snaps to the starting center and walks smoothly along the legal route
- **AND** travel finishes centered at the destination, the 30-step endpoint, or the safe pre-trap cell, unless otherwise interrupted

#### Scenario: Resume keyboard movement after selection
- **WHEN** the player chooses any movement mode and presses WASD or an arrow key
- **THEN** the utility selector returns focus to gameplay and the selected keyboard movement behavior applies

#### Scenario: Gridless sprite locomotion
- **WHEN** accepted Gridless pixel movement continues
- **THEN** the directional run clip loops without restarting each frame and returns to idle when travel stops
- **AND** Grid-snap, Grid-tween, and Battle retain their existing sprite presentation

#### Scenario: Enter Battle during automatic travel
- **WHEN** a qualifying enemy causes Battle before the destination is reached
- **THEN** queued travel stops and a new click requests only one grid step
