# Spec Delta

## ADDED Requirements

### Requirement: Drop a quick-slot stack through Drop Item
A populated Quick Slot SHALL be draggable to Drop Item, and a committed drop SHALL remove the complete positive stack from the Quick Slot and create a collectible world representation using the stack quantity.

#### Scenario: Drop Mana Potion stack
- **WHEN** Quick Slot 02 contains Mana Potion X2 and is released over Drop Item
- **THEN** Quick Slot 02 clears and the world contains a Mana Potion representation with quantity 2

#### Scenario: Cancel quick-slot drop
- **WHEN** a Quick Slot stack is dragged away from Drop Item and released elsewhere
- **THEN** the stack remains in its original Quick Slot
