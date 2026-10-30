# world-item-drops Specification

## Purpose
Provides a universal path for carried game objects to leave UI storage and return to the dungeon as collectible, identifiable world items.

## Requirements

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

#### Scenario: Removing capacity forces overflow drops
- **WHEN** Extra Space is dropped while the remaining inventory exceeds the base capacity
- **THEN** the game drops enough additional inventory stacks to restore the post-drop capacity, uses a deterministic selection, and gives each spawned object a distinct walkable cell by expanding through cardinal neighbors when the preferred cells are occupied

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

### Requirement: Render an identifiable graphic for every Jewel
Each of the ten Jewels SHALL have its own finished world graphic, recognizable at the game's native item display size. Ring, bracelet, and amulet families SHALL have distinct silhouettes; tiers SHALL have distinguishable material and detail treatments. Every name SHALL resolve to its intended graphic without a generic bag, missing texture, blank frame, or unrelated item fallback.

#### Scenario: Inspect the complete Jewel art set
- **WHEN** all ten Jewels are displayed at native world Zoom
- **THEN** every item has a non-empty transparent-background sprite with no neighboring-frame bleed or clipping, and its family and tier can be distinguished

### Requirement: Keep Jewel art consistent across discovery and transfer
A Jewel SHALL use the same item graphic when generated on the floor, released from a chest or crate, thrown by a player drop, settled on the ground, and transferred from the world to Inventory. Existing ground anchors, shadows, visibility, transfer timing, and category colors SHALL continue to apply.

All ten Jewels SHALL render at 16 by 16 world pixels, 50% of the original item width and height, while settled and thrown. Ground shadows SHALL scale proportionately. Pickup transfers SHALL begin at that same world size and retain the existing receiving Inventory row size and transfer timing.

#### Scenario: Follow a Jewel from discovery to Inventory
- **WHEN** a generated Sapphire Amulet is collected
- **THEN** its world sprite transfers to its receiving Inventory row without changing to another item's frame and the row credit follows existing transfer timing

#### Scenario: Drop a worn Jewel
- **WHEN** a worn Gold Guard Bracelet is committed to Drop Item
- **THEN** its Defense buff is removed, its bracelet graphic follows the drop throw and settled pickup, and it remains collectible

### Requirement: Preserve Jewel ownership through drop and recollection
Dropping a Jewel from Inventory or Jewels SHALL use existing atomic source-removal and valid nearby-cell rules. Recollection SHALL return the same non-stackable instance to Inventory without auto-equipping it. Invalid placement, cancellation, or a full receiving Inventory SHALL NOT lose or duplicate the item.

#### Scenario: Recollect every Jewel definition
- **WHEN** each of the ten Jewel definitions is separately dropped and collected again
- **THEN** its identity, name, fixed modifiers, one-entry capacity cost, and intended graphic are retained

#### Scenario: Reject a drop with no valid cell
- **WHEN** the player drops a Jewel and no valid nearby destination exists
- **THEN** it remains at its source with its original buffs and no accepted drop tick or duplicate world entity

#### Scenario: Walk over a Jewel with full Inventory
- **WHEN** Inventory cannot hold a Jewel on the player's destination cell
- **THEN** movement follows the existing rules and the Jewel remains on the ground with no equipment change
