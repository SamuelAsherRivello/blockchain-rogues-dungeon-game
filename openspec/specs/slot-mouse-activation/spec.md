# slot-mouse-activation Specification

## Purpose

Make mouse activation of abilities and quick-slot items clear while preserving existing slot interactions.

## Requirements

### Requirement: Show a use control on populated ability and quick slots
Each populated ability and quick-slot row SHALL display a `Use` button after its item name. Empty rows SHALL NOT display a Use button. The control SHALL remain visible and usable within the supported desktop and mobile layouts.

#### Scenario: Populated and empty slots
- **WHEN** a panel shows a populated ability or quick slot and an empty slot
- **THEN** the populated row shows a Use button after its name and the empty row does not

### Requirement: Use the existing action and availability rules
Clicking an enabled Use button SHALL request the same action exactly once as the existing row click. Unavailable actions SHALL show a disabled Use button and SHALL NOT activate through it. Existing row-click and keyboard activation SHALL remain available under their current rules.

#### Scenario: Use an available quick-slot item
- **WHEN** the player clicks Use on an available quick-slot item
- **THEN** the game requests one use under the existing item and turn rules

#### Scenario: Unavailable ability
- **WHEN** an ability is unavailable
- **THEN** its Use button is disabled and clicking it does not activate the ability or advance time

### Requirement: Preserve slot dragging
Use controls SHALL coexist with existing slot drag-and-drop, including rearranging abilities and transferring quick-slot items. A drag SHALL NOT activate the slot and clicking Use SHALL NOT begin a drag.

#### Scenario: Rearrange an ability
- **WHEN** the player drags a populated ability to another ability slot
- **THEN** the existing move or swap behavior occurs without using the ability
