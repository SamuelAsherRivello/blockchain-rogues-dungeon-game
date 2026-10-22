# Spec Delta

## ADDED Requirements

### Requirement: Apply inventory capacity modifiers
Inventory SHALL calculate effective capacity as the base capacity plus the modifiers granted by carried capacity items. Extra Space SHALL occupy one inventory slot and grant five additional capacity slots while carried.

#### Scenario: Carry Extra Space
- **WHEN** the base capacity is 10 and Extra Space is carried in Inventory
- **THEN** the inventory title shows 15 effective capacity and Extra Space consumes one of those slots

#### Scenario: Remove Extra Space
- **WHEN** Extra Space is moved out of Inventory
- **THEN** effective capacity decreases by five and the transfer is rejected if removing it would leave the remaining contents over capacity

### Requirement: Provide a permanent Drop Item destination
Inventory SHALL render a first Drop Item row above all capacity-counted rows regardless of current item count. The row SHALL accept incoming transferable objects, SHALL not be draggable, and SHALL not count toward capacity.

#### Scenario: Read Drop Item
- **WHEN** Inventory is displayed with any number of items
- **THEN** a neutral empty-looking row labeled `[ Drop Item ]` appears above the first inventory row

#### Scenario: Drop from Inventory
- **WHEN** an Inventory item is released over Drop Item
- **THEN** the item is removed from Inventory only after the world drop commits

#### Scenario: Drop Extra Space while over capacity
- **WHEN** Extra Space is released over Drop Item and the remaining inventory exceeds base capacity
- **THEN** the same action deterministically drops enough additional inventory stacks to restore base capacity, placing each dropped object in a distinct walkable cell found by expanding beyond the nearby ring when necessary

### Requirement: Store abilities in Inventory
Inventory SHALL accept an ability transferred from an occupied Ability position and SHALL display it as a draggable ability entry without applying its effect while stored there.

#### Scenario: Move Heal to Inventory
- **WHEN** Heal is dragged from Ability position 01 to an available Inventory destination
- **THEN** position 01 becomes empty, Heal appears in Inventory, and no ability effect or world tick occurs until the transfer commits according to the existing transaction rules
