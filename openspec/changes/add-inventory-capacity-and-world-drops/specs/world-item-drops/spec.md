# Spec Delta

## Purpose

Provides a universal path for carried game objects to leave UI storage and return to the dungeon as collectible, identifiable world items.

## ADDED Requirements

### Requirement: Drop any transferable object into the world
The game SHALL accept a committed drag from Inventory, Equipment, Quick Slots, or an occupied Ability position onto the Drop Item destination and SHALL remove the object from its source before spawning its world representation.

#### Scenario: Drop an equipped weapon
- **WHEN** a Wooden Stick is dragged from Weapons to Drop Item and released
- **THEN** the stick leaves Equipment, appears in the world near the player, and Equipment and Inventory state remain consistent

#### Scenario: Reject a canceled drop
- **WHEN** a dragged object is released outside Drop Item or the gesture is canceled
- **THEN** the source object remains unchanged and no world object is spawned

### Requirement: Spawn dropped objects beside the player
Dropped objects SHALL settle one walkable, unoccupied cell diagonally above-left or above-right of the player, preferring the selected side and using the other side or another valid adjacent cell as deterministic fallback.

#### Scenario: Spawn a dropped object
- **WHEN** the player drops an item with an available preferred cell
- **THEN** the item travels from the player to that cell and remains collectible there

#### Scenario: Preferred cells are unavailable
- **WHEN** both preferred cells are blocked
- **THEN** the drop uses the first valid deterministic nearby cell, or is rejected without losing the source if no valid cell exists

### Requirement: Represent every droppable object distinctly
Every equipment item, ability, consumable, and capacity item that can be dropped SHALL have a stable world representation and SHALL be distinguishable from unrelated world pickups.

#### Scenario: Drop an ability
- **WHEN** Heal is dropped from Inventory into the world
- **THEN** the world shows an identifiable Heal representation that can be collected again

### Requirement: Recollect a dropped object
A player entering a dropped object's cell SHALL collect it using the same capacity, stacking, and destination rules as its original object type.

#### Scenario: Recollect dropped Extra Space
- **WHEN** the player walks onto a dropped Extra Space item and has capacity for it
- **THEN** Extra Space returns to Inventory and its capacity modifier becomes active

#### Scenario: Recollect while full
- **WHEN** the player walks onto a dropped ordinary item with no effective Inventory capacity
- **THEN** the item remains in the world and the player action follows the existing full-inventory behavior
