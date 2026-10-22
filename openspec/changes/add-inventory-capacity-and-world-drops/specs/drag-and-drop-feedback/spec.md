# Spec Delta

## ADDED Requirements

### Requirement: Mark Drop Item as a destructive landing target
While a transferable object is dragged over Drop Item, the destination SHALL show a red border landing state distinct from ordinary compatible blue, green, or purple landing states.

#### Scenario: Hover Drop Item
- **WHEN** any transferable object is dragged over Drop Item
- **THEN** Drop Item shows the red landing state and the source remains visibly departing

#### Scenario: Leave Drop Item
- **WHEN** the dragged object leaves Drop Item without release
- **THEN** the red landing state clears and no drop is committed
