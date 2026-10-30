# Spec Delta

## MODIFIED Requirements

### Requirement: Accept equipment by compatible group
Equipment SHALL expose Weapons, Armor, and Jewels groups with two positions each. A compatible item SHALL be assignable to either position within its group. Two-slot equipment SHALL require and occupy both positions in its compatible group. Sword and shield SHALL both be compatible with Weapons. Every initial ring, bracelet, and amulet SHALL be compatible only with Jewels and SHALL occupy one position. Position within a group SHALL have no independent attribute modifier. Incompatible or unavailable destinations SHALL reject the drop without committing. A compatible Inventory item dropped into occupied required positions SHALL swap atomically when every displaced item can enter Inventory.

#### Scenario: Choose weapon position
- **WHEN** a one-slot sword is dragged into either available Weapons position
- **THEN** it enables there and applies the same item modifiers in either position

#### Scenario: Reject incompatible equipment
- **WHEN** a Chest Plate is dropped into Weapons
- **THEN** the item returns to its source and the player state and time remain unchanged

#### Scenario: Reject an occupied equipment destination
- **WHEN** an Inventory item is dropped onto an occupied equipment position but the displaced items cannot all enter Inventory
- **THEN** the drop is rejected, the item remains in Inventory, and no prompt, state change, or world tick occurs

#### Scenario: Swap one-slot weapon
- **WHEN** a Sword is released over an occupied Weapons position and Inventory has room for the displaced item
- **THEN** the Sword equips, the displaced item enters alphabetical Inventory order, and one turn advances

#### Scenario: Reject two-slot capacity failure
- **WHEN** a Two-Handed Sword is released while both Weapons positions are occupied and Inventory lacks room for both displaced items
- **THEN** the release is rejected with no equipment, Inventory, attribute, or time change

#### Scenario: Choose either Jewel position
- **WHEN** any ring, bracelet, or amulet is released over either valid Jewel position
- **THEN** it equips or swaps using the same atomic equipment rules and costs one tick

#### Scenario: Reject cross-group Jewel placement
- **WHEN** a Jewel is dropped into Weapons or Armor, or a weapon or armor item is dropped into Jewels
- **THEN** the source, Inventory, attributes, and world time remain unchanged

### Requirement: Preview attributes only over a relevant equipment slot
While an item is actively being dragged over a compatible complete equipment destination, Slot Drag Preview SHALL show the projected complete-loadout attribute values for that destination. It SHALL compare current and projected Health, Offense, Defense, Mana, and perks, including every added and removed Jewel modifier. Values SHALL be green for an increase, red for a decrease, and white when unchanged. Starting a drag, hovering Inventory, hovering an incompatible or invalid destination, leaving a relevant equipment position, or ending the drag SHALL show no projected values. Preview SHALL NOT change authoritative attributes, resources, Inventory, combat effects, or world time.

#### Scenario: Preview drag-in
- **WHEN** an Inventory item hovers over a compatible available equipment position
- **THEN** Attributes show the values that enabling that item would produce, using green/red for differences

#### Scenario: Preview an occupied slot
- **WHEN** Dagger (Magic) hovers an occupied Weapons position and the displaced item fits in Inventory
- **THEN** the comparison includes the equipped item's removal and the Dagger's addition before release

#### Scenario: Clear preview outside an equipment target
- **WHEN** the pointer leaves a compatible equipment position while an item remains in a drag operation
- **THEN** projected attribute values clear until the item enters another relevant equipment position

#### Scenario: Compare a ring with an amulet
- **WHEN** Sapphire Amulet hovers over a worn Silver Ring of Vigor in a valid Jewel destination
- **THEN** the preview shows maximum Health decreasing by 10 and maximum Mana increasing by 10 without changing current resources or time

### Requirement: Render draggable item rows consistently
Equipment and Inventory entries SHALL occupy the card's full content width as horizontal rows. Equipment SHALL show Weapons, Armor, and Jewels section titles in that order, with Jewels directly below Armor. Empty positions SHALL look like drop targets without visible placeholder text. Equipment positions SHALL support cosmetic rearrangement within a compatible group, costing one tick for a committed rearrangement. The existing panel arrangement, focused view, and scrolling boundaries SHALL be retained.

#### Scenario: Read empty Armor position
- **WHEN** an Armor position is empty
- **THEN** it displays a full-width drop target with a `+` availability marker and no item name

#### Scenario: Show drag affordance only for draggable rows
- **WHEN** an equipment or Inventory row can be dragged
- **THEN** it shows a drag indicator and grab cursor; empty equipment targets and non-draggable rows do not show a grab cursor

#### Scenario: Exchange weapon positions
- **WHEN** the player swaps an equipped sword and shield within Weapons
- **THEN** their positions exchange, their combined attribute effect stays the same, and time advances once

#### Scenario: Read the added Jewel section
- **WHEN** the equipment panel is viewed in landscape, portrait Info mode, its focused view, or fullscreen
- **THEN** two full-width Jewel rows appear directly below Armor, remain reachable through existing equipment scrolling, and leave the Abilities, Quick Slots, and Inventory panel order unchanged

#### Scenario: Reorder two Jewels
- **WHEN** two equipped Jewels exchange positions
- **THEN** their combined modifiers are unchanged, the action costs one tick, and no pair indicator appears

### Requirement: Mark Inventory items by destination category
Every occupied Inventory row SHALL show a vertical left-edge strip in its item's destination-category color. Quick-slottable consumables SHALL use green and equipment SHALL use blue. Every displayed row of a multi-position item SHALL share that color. Generic empty Inventory positions SHALL remain neutral until valid return-hover feedback applies. Category cues SHALL NOT override equipment-group or drop-validation rules.

#### Scenario: Identify potion destinations
- **WHEN** Health Potion and Mana Potion stacks appear in Inventory
- **THEN** both have green strips matching Quick Slots regardless of the resource restored

#### Scenario: Identify equipment destinations
- **WHEN** a weapon, armor item, or Jewel appears in Inventory
- **THEN** each displayed row has a blue strip matching Equipment while Weapons, Armor, and Jewels labels distinguish compatible groups

#### Scenario: Preserve two-position identity
- **WHEN** an Inventory item occupies two displayed positions
- **THEN** both rows show the same blue strip and the secondary row retains its existing non-draggable state

#### Scenario: Avoid a false inventory category
- **WHEN** an Inventory position is empty and no valid return drag hovers it
- **THEN** it shows its neutral empty treatment without an Ability, Quick, or Equipment strip
