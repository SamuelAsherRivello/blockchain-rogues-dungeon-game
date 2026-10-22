# Spec Delta

## ADDED Requirements

### Requirement: Mark Inventory items by destination category
Every occupied Inventory row SHALL show a vertical left-edge strip in its item's destination-category color. Quick-slottable consumables SHALL use green and equipment SHALL use blue. Every displayed row of a multi-position item SHALL share that color. Generic empty Inventory positions SHALL remain neutral until valid return-hover feedback applies. Category cues SHALL NOT override equipment-group or drop-validation rules.

#### Scenario: Identify potion destinations
- **WHEN** Health Potion and Mana Potion stacks appear in Inventory
- **THEN** both have green strips matching Quick Slots regardless of the resource restored

#### Scenario: Identify equipment destinations
- **WHEN** a weapon or armor item appears in Inventory
- **THEN** each displayed row has a blue strip matching Equipment while Weapons and Armor labels distinguish compatible groups

#### Scenario: Preserve two-position identity
- **WHEN** an Inventory item occupies two displayed positions
- **THEN** both rows show the same blue strip and the secondary row retains its existing non-draggable state

#### Scenario: Avoid a false inventory category
- **WHEN** an Inventory position is empty and no valid return drag hovers it
- **THEN** it shows its neutral empty treatment without an Ability, Quick, or Equipment strip
