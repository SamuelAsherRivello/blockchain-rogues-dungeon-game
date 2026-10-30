# jewel-equipment Specification

## Purpose

Provide flexible worn jewelry with predictable passive bonuses and complete item identities so every Jewel works throughout the existing inventory and dungeon item lifecycle.

## Requirements

### Requirement: Provide the ten agreed Jewel items
The game SHALL provide exactly the ten initial Jewel definitions listed below. Their modifiers SHALL be additive resource points or Defense points, not progression ranks or percentages. Every definition SHALL occupy one equipment position and one Inventory entry and SHALL be non-stackable.

#### Scenario: Read the initial Jewel catalog
- **WHEN** the initial Jewel definitions are inspected
- **THEN** their names, families, and fixed buffs are:

| Item | Family | Fixed buff |
| --- | --- | --- |
| Copper Ring of Vigor | Ring | Maximum Health +5 |
| Silver Ring of Vigor | Ring | Maximum Health +10 |
| Gold Ring of Vigor | Ring | Maximum Health +15 |
| Copper Guard Bracelet | Bracelet | Defense +1 |
| Silver Guard Bracelet | Bracelet | Defense +2 |
| Gold Guard Bracelet | Bracelet | Defense +3 |
| Quartz Amulet | Amulet | Maximum Mana +5 |
| Sapphire Amulet | Amulet | Maximum Mana +10 |
| Star Sapphire Amulet | Amulet | Maximum Mana +15 |
| Prismatic Amulet | Amulet | Maximum Health +5 and maximum Mana +5 |

### Requirement: Apply Jewel effects only while worn
A Jewel SHALL apply its modifiers only while equipped in Jewels. Carrying, generating, finding, dropping, or storing a Jewel SHALL NOT grant its buffs. Jewels SHALL have no activation action, Mana cost, charge count, consumable quantity, or new ability binding.

#### Scenario: Collect an Amulet without equipping it
- **WHEN** a Sapphire Amulet enters Inventory
- **THEN** maximum Mana and ability bindings remain unchanged until the Amulet is equipped

#### Scenario: Reject a Jewel as an active item
- **WHEN** a Jewel is dragged onto Abilities or Quick Slots
- **THEN** the operation is rejected without a state change or tick and neither panel changes behavior

### Requirement: Sum independent Jewel instances without pair bonuses
Each collected Jewel SHALL have a distinct instance identity. Two Jewel instances SHALL remain separate Inventory entries, and both Jewel positions SHALL accept them even when their definitions or families match. Their modifiers SHALL add once per equipped instance; family, position, or combination SHALL grant no additional bonus.

#### Scenario: Wear two matching rings
- **WHEN** two distinct Gold Ring of Vigor instances occupy Jewels
- **THEN** they grant maximum Health +30 in total and remain two independently removable items

#### Scenario: Wear a mixed pair
- **WHEN** Silver Ring of Vigor and Silver Guard Bracelet occupy Jewels
- **THEN** they grant maximum Health +10 and Defense +2 with no Offense or pair bonus

### Requirement: Preserve resource fullness for Jewel changes
Equipping, replacing, removing, or dropping a Jewel that changes maximum Health or Mana SHALL preserve that resource's fullness using the existing maximum-change rules. Current values SHALL remain finite and bounded. Defense SHALL use the existing combat calculation. A Jewel change SHALL NOT cast an ability or act as a potion refill.

#### Scenario: Equip a Health ring while injured
- **WHEN** Health is 10 of 20 and Copper Ring of Vigor is equipped
- **THEN** Health becomes 12.5 of 25, subject only to the existing resource display formatting

#### Scenario: Replace a Prismatic Amulet
- **WHEN** a worn Prismatic Amulet is replaced with a Sapphire Amulet
- **THEN** the comparison and committed state remove maximum Health +5 and replace maximum Mana +5 with +10 while preserving each resource's fullness

#### Scenario: Raise a zero Mana maximum
- **WHEN** maximum Mana is zero before a Jewel adds Mana capacity
- **THEN** current Mana remains zero and no invalid arithmetic or automatic full refill occurs

### Requirement: Register every Jewel across item destinations
Every Jewel definition SHALL be available to ordinary loot creation, Inventory, both Jewel positions, supported generic item containers, ground drops, and saved items. The name, family, identity, fixed modifiers, and graphic selection SHALL remain consistent across those destinations.

#### Scenario: Complete the lifecycle for every definition
- **WHEN** each of the ten definitions is generated, collected, equipped, returned, dropped, recollected, saved, and loaded
- **THEN** it retains the same instance identity and fixed buffs and appears under the correct name and graphic
