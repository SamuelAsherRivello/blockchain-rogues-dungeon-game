# Spec delta

## MODIFIED Requirements

### Requirement: Provide a permanent Drop Item destination
The player's ordinary Inventory SHALL render a first Drop Item row above all capacity-counted rows regardless of current item count. The row SHALL accept incoming transferable objects, SHALL not be draggable, and SHALL not count toward capacity. A shared inventory presentation configured for lockbox storage SHALL omit this row and disable world-drop behavior.

#### Scenario: Read Drop Item
- **WHEN** ordinary player Inventory is displayed with any number of items outside a lockbox session
- **THEN** a neutral empty-looking row labeled `[ Drop Item ]` appears above the first inventory row

#### Scenario: Drop from Inventory
- **WHEN** an Inventory item is released over Drop Item outside a lockbox session
- **THEN** the item is removed from Inventory only after the world drop commits

#### Scenario: Drop Extra Space while over capacity
- **WHEN** Extra Space is released over Drop Item outside a lockbox session and the remaining inventory exceeds base capacity
- **THEN** the same action deterministically drops enough additional inventory stacks to restore base capacity, placing each dropped object in a distinct walkable cell found by expanding beyond the nearby ring when necessary

#### Scenario: Display a lockbox
- **WHEN** the shared inventory presentation displays lockbox contents
- **THEN** no Drop Item row or world-drop action is available

## ADDED Requirements

### Requirement: Configure the shared inventory presentation for a container
The shared inventory presentation SHALL support configurable contents, capacity, container identity, and Drop Item visibility. Its defaults SHALL preserve the player Inventory's existing rows, effective capacity, sorting, category cues, and scrolling. Lockbox mode SHALL display its own contents and ten fixed capacity positions without reading player-carried capacity bonuses.

#### Scenario: Render player Inventory and lockbox together
- **WHEN** both containers are visible during a lockbox session
- **THEN** each displays its own contents and capacity and drag feedback identifies the correct source and destination

#### Scenario: Preserve ordinary Inventory defaults
- **WHEN** player Inventory is shown without lockbox mode
- **THEN** its existing effective-capacity calculation, alphabetical rows, category cues, scrollbar, and Drop Item row are preserved
