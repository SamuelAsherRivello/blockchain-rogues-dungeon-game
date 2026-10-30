# Spec Delta

## ADDED Requirements

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
