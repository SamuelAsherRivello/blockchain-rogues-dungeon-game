# Spec delta

## Purpose

Provide storage through human-authored lockboxes so players can manage carried items and retain separate container contents throughout each Saved Game.

## ADDED Requirements

### Requirement: Instantiate lockboxes only from authored objects
Runtime lockboxes SHALL correspond one-to-one to human-placed lockbox objects in a map prefab. Runtime SHALL preserve each object's authored identity, position, and art, and SHALL NOT procedurally distribute lockboxes, add test-mode instances, or recreate missing placements.

#### Scenario: Enter the authored player home
- **WHEN** the player enters the home containing the authored left and right lockboxes
- **THEN** exactly those two lockboxes appear at their authored positions

#### Scenario: Move or remove a placement
- **WHEN** a human moves or removes a lockbox object and the updated prefab is loaded
- **THEN** runtime moves or removes that lockbox without retaining its old visual, blocker, or interaction target

### Requirement: Block traversal at each lockbox
Each lockbox SHALL block player and actor traversal, diagonal corner cutting, and paths through its footprint. Bumping an accessible adjacent lockbox SHALL leave the player outside its footprint and open that lockbox's storage window under every supported movement mode.

#### Scenario: Bump a lockbox
- **WHEN** the player attempts to move into an adjacent lockbox
- **THEN** the player remains outside it and its Lockbox window opens without advancing time

#### Scenario: Route around a lockbox
- **WHEN** movement or pathfinding evaluates a route across a lockbox footprint
- **THEN** it treats the footprint as blocked and routes around it or rejects the route

### Requirement: Present the Lockbox window over the game view
The storage window SHALL use the in-game Settings size at the same layout size and be centered on the available game view's X and Y midpoint. It SHALL show the heading `Lockbox` and an X close button, darken the game view, and keep storage and player Inventory usable in supported landscape, portrait, windowed, and fullscreen layouts.

#### Scenario: Open storage in a responsive layout
- **WHEN** the Lockbox window is open in a supported layout
- **THEN** its dimensions match in-game Settings, its center matches the available game view, and both inventories remain reachable

#### Scenario: Resize while storage is open
- **WHEN** viewport dimensions, orientation, or fullscreen state changes
- **THEN** the window follows the current Settings dimensions and game-view midpoint without clipping its close control

### Requirement: Pause world play while allowing storage interaction
While a Lockbox window is open, gameplay simulation and world input SHALL be paused. Inventory transfer, inventory scrolling, and window dismissal SHALL remain available. Movement, abilities, Quick Slot use, equipment changes, world drops, and queued travel SHALL NOT advance or mutate the world during storage management.

#### Scenario: Hold movement while opening storage
- **WHEN** a held direction or queued mouse path reaches a lockbox and opens storage
- **THEN** queued travel stops and held input cannot advance the player, enemies, hazards, or world time while it is open

#### Scenario: Resume after closing
- **WHEN** the player closes storage
- **THEN** gameplay resumes without replaying input collected while it was open

### Requirement: Provide ten fixed storage positions
Each lockbox SHALL start empty and provide exactly ten capacity positions using the shared inventory presentation. It SHALL omit Drop Item, show stored item categories and quantities, and apply the existing stack and multi-position presentation rules. Stored capacity items SHALL NOT expand a lockbox or contribute effects to the player.

#### Scenario: Open a new lockbox
- **WHEN** a Saved Game opens a lockbox that has never held an item
- **THEN** the window displays ten empty positions and no Drop Item row

#### Scenario: Store a capacity item
- **WHEN** a capacity-granting item is stored in a lockbox
- **THEN** it occupies its ordinary position count and the lockbox remains limited to ten positions

### Requirement: Transfer items atomically between Inventory and storage
The player SHALL be able to drag a whole item or whole stack between Inventory and the open lockbox. A valid transfer SHALL preserve identity, properties, and quantities, commit both containers together, and cost no time. Transfers SHALL validate destination occupancy and the player's resulting carrying capacity, including capacity-item removal.

#### Scenario: Deposit and withdraw equipment
- **WHEN** a player deposits an Inventory sword into an available lockbox and later withdraws it
- **THEN** exactly one sword changes owner each time and retains its item properties without advancing time

#### Scenario: Transfer a stack
- **WHEN** a consumable stack is deposited or withdrawn
- **THEN** its whole quantity moves once and combines only with a compatible stack under the existing stacking rules

#### Scenario: Account for a multi-position item
- **WHEN** an item occupying two displayed positions is offered to a lockbox with only one position free
- **THEN** the transfer is rejected without changing either container

#### Scenario: Remove carried capacity
- **WHEN** depositing a carried capacity item would leave the remaining Inventory over its resulting capacity
- **THEN** the transfer is rejected without dropping items into the world

### Requirement: Cancel invalid transfers without side effects
Invalid destinations, full destinations, release outside a destination, source-return, Escape, pointer cancellation, and window closure SHALL commit no transfer and clear drag feedback. The storage session SHALL accept transfers only between Inventory and the currently open lockbox.

#### Scenario: Release over a full Inventory
- **WHEN** the player drags a stored item toward Inventory without capacity for it
- **THEN** it remains in the lockbox and neither container nor the world changes

#### Scenario: Close during a drag
- **WHEN** the player closes the Lockbox window during an uncommitted drag
- **THEN** the drag is cancelled and its item remains at its source

#### Scenario: Reject another action destination
- **WHEN** a lockbox-session item is released over Equipment, an Ability position, a Quick Slot, Drop Item, the world, or another closed lockbox
- **THEN** no item transfer or gameplay action commits

### Requirement: Keep storage identities independent of level and position
The two home lockboxes SHALL have independent contents within each Saved Game. Their identities SHALL remain stable across dungeon levels, run changes, and changes to authored position, and SHALL NOT depend on transient entity order or coordinates. Removing an authored object SHALL remove access to it without transferring or deleting its stored contents.

#### Scenario: Visit home from another level
- **WHEN** an item is stored in the left lockbox and the player later enters home from another dungeon level
- **THEN** the left lockbox retains that item and the right lockbox retains its own separate contents

#### Scenario: Move the authored object
- **WHEN** a human moves a lockbox while preserving its authored identity
- **THEN** it exposes the same stored contents at its new position

#### Scenario: Reintroduce a temporarily removed object
- **WHEN** the same authored lockbox identity is restored to its prefab
- **THEN** it can access its previously retained contents without automatic runtime placement
