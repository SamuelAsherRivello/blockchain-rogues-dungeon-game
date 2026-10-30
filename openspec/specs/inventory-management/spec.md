# inventory-management Specification

## Purpose
Manage collected items, compatible equipment groups, and live drag previews so only committed equipment changes alter the player's attributes and gameplay.

## Requirements

### Requirement: Collect ordinary items into Inventory
Ordinary item pickups SHALL enter Inventory without auto-equipping, prompting, or suspending gameplay. Inventory-held items SHALL have no effect on the player. The accepted collection's visible Inventory credit SHALL appear after its world-to-UI transfer completes. Resource potion pickups SHALL follow resource-meter collection rules.

#### Scenario: Collect a sword
- **WHEN** the player walks onto a sword with Inventory capacity available
- **THEN** it leaves the world, transfers to its planned Inventory row, and appears there after the transfer without an equipment or attribute change or dialog

### Requirement: Display bounded alphabetical Inventory
Inventory SHALL show full-width horizontal item entries without groups, ordered alphabetically by item name. Its bordered card title SHALL show current/max carry with at least two-digit counts, such as `Inventory 00/05`. A new run's base capacity SHALL be five entries. Inventory SHALL always show a vertical scroll track. Capacity SHALL count Inventory entries; equipped items SHALL be outside that count.

#### Scenario: Display Inventory count
- **WHEN** no items are carried in a newly created run
- **THEN** the title reads `Inventory 00/05`

#### Scenario: Ignore Inventory drop position
- **WHEN** an equipped item is dropped anywhere in Inventory
- **THEN** it is inserted at its alphabetical position rather than the pointer's row position

#### Scenario: Inventory is full
- **WHEN** the player walks onto an ordinary item with no remaining capacity
- **THEN** movement is accepted and the item remains in the world without a prompt or attribute change

### Requirement: Start each run with empty item bindings
A newly created campaign and its post-death replacement run SHALL begin with empty Inventory, all equipment positions empty, and both Quick Slots empty. The run SHALL not create starter gear, potions, capacity items, or resource counters outside the generated starter pack.

#### Scenario: Confirm a new character
- **WHEN** the player confirms a new character
- **THEN** Inventory reads `00/05`, Equipment and Quick Slots are empty, and gold and keys begin at zero

#### Scenario: Begin a replacement run after death
- **WHEN** a character begins the post-death replacement run
- **THEN** its run-bound items, equipment, Quick Slots, gold, and keys are reset to the same empty starting state

### Requirement: Provide net carrying capacity items
`Extra Carrying Capacity +5` SHALL be a non-stackable Inventory item that occupies one Inventory entry and increases total capacity by six, yielding five more usable carrying positions than the same Inventory without it. Its rows and comparisons SHALL show a dedicated carrying-capacity icon and a `+5` carrying-capacity effect.

#### Scenario: Carry one capacity item
- **WHEN** an Inventory at base capacity contains Extra Carrying Capacity +5
- **THEN** its maximum capacity is 11 and ten other entries can be carried alongside it

#### Scenario: Acquire a second capacity item
- **WHEN** the player collects a second Extra Carrying Capacity +5
- **THEN** it occupies its own entry and is not combined into a quantity stack

### Requirement: Add Level One wooden chest armor
Wooden Vest SHALL be an armor item that occupies one Armor position, grants `+1` Defense, and uses a distinct wooden chest-only visual without arms, waist, or legs.

#### Scenario: Equip Wooden Vest
- **WHEN** Wooden Vest is assigned to an empty Armor position
- **THEN** the player gains `+1` Defense and the item is no longer counted in Inventory

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

### Requirement: Commit or cancel equipment drag atomically
A valid release into, out of, or within equipment SHALL apply the complete projected loadout transaction, end preview, restore white attribute numbers, and advance exactly one time unit. A canceled drag, invalid drop, return to the source, or capacity failure SHALL restore the original display and commit nothing.

#### Scenario: Enable equipment
- **WHEN** an Inventory item is fully released into an available compatible position
- **THEN** it leaves Inventory, becomes enabled, applies its effects, and causes one world tick

#### Scenario: Return an item to its source
- **WHEN** a dragged equipped item is released back into its original position
- **THEN** preview ends with no attribute, resource, Inventory, or time change

#### Scenario: Inventory cannot accept drag-out
- **WHEN** equipped gear is released into a full Inventory
- **THEN** it remains equipped and the preview and time cost are canceled

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

### Requirement: Classify and transfer consumables for Quick Slots
Inventory SHALL distinguish quick-slottable consumables from equipment. Health Potion and Mana Potion entries SHALL be transferable to a compatible Quick Slot or returned from a Quick Slot, while weapons and armor SHALL remain governed by equipment rules and SHALL NOT be accepted by Quick Slots.

#### Scenario: Keep equipment out of Quick Slots
- **WHEN** a sword is dragged toward a Quick Slot
- **THEN** the destination rejects it and the sword remains governed by Inventory and Equipment rules

#### Scenario: Preserve Inventory after an invalid Quick Slot drop
- **WHEN** an incompatible item is released over a Quick Slot
- **THEN** the item remains in its original location and Inventory ordering is unchanged

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

### Requirement: Penalize encumbered movement
When Inventory entry count exceeds carrying capacity, the player SHALL need two valid movement inputs in the same intended direction to move one tile. Non-movement inputs and rejected movement SHALL not arm or consume the pending movement input.

#### Scenario: Take an encumbered step
- **WHEN** an encumbered player presses the same valid movement direction twice
- **THEN** the second input moves one tile and advances one turn
