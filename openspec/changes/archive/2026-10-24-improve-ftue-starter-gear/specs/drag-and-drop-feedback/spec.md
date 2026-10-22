# Spec Delta

## ADDED Requirements

### Requirement: Compare every valid item-transfer outcome
While an item drag hovers a valid Equipment, Quick Slot, Ability, or discard destination, the interface SHALL show an Item Comparison panel with the source state, destination state, and the resulting net effects. Empty positions SHALL be represented as empty positions, and discard SHALL compare the item before removal with nothing after removal.

#### Scenario: Preview a Quick Slot assignment
- **WHEN** a compatible potion hovers an empty Quick Slot
- **THEN** Item Comparison shows the potion and empty position before and after the assignment with its net effects

#### Scenario: Preview an Ability placement
- **WHEN** an ability hovers an empty Ability position
- **THEN** Item Comparison shows the source and empty destination before and after the placement

#### Scenario: Preview an item discard
- **WHEN** an Inventory or equipped item hovers the valid Drop Item target
- **THEN** Item Comparison shows the item before removal, nothing after removal, and the net effects lost

### Requirement: Keep comparison labels legible
Item Comparison labels and content SHALL remain fully visible within their panels during every supported drag comparison state.

#### Scenario: Preview from an empty source position
- **WHEN** a comparison contains an empty Before position and a populated After position
- **THEN** the `Before` label is not clipped or overlapped by its panel border
