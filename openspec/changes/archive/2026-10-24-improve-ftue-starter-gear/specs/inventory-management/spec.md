# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
