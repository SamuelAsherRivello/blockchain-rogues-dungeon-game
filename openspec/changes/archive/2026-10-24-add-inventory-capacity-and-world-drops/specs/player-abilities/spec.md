# Spec Delta

## ADDED Requirements

### Requirement: Transfer abilities through Inventory
An occupied Ability position SHALL be draggable to Inventory or Drop Item, and an ability in Inventory SHALL be draggable back to an empty or compatible Ability position using the existing positional binding rules.

#### Scenario: Return an ability to a binding
- **WHEN** Wand is dragged from Inventory to Ability position 03
- **THEN** position 03 binds Wand, its Inventory entry is removed, and keyboard activation uses position 03

#### Scenario: Drop an ability
- **WHEN** Wand is dragged from an Ability position to Drop Item
- **THEN** the ability leaves its binding and becomes a collectible world object
