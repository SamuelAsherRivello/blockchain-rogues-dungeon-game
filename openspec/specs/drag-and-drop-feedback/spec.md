# drag-and-drop-feedback Specification

## Purpose

Make item drag gestures legible through pointer-following, source, destination, and attribute-projection feedback before a drop is committed.

## Requirements

### Requirement: Show an active item under the pointer
Once an Inventory or equipment item passes the drag threshold, the interface SHALL show a non-interactive preview of that item following the active pointer. The preview SHALL remain visible over valid, invalid, and empty areas until the gesture ends.

#### Scenario: Begin an Inventory drag
- **WHEN** a player drags Wooden Stick from Inventory beyond the drag threshold
- **THEN** a preview identifying Wooden Stick follows the pointer and does not block target detection

#### Scenario: Drag an equipped item away from its row
- **WHEN** a player drags an equipped item beyond the drag threshold
- **THEN** its preview follows the pointer until release or cancellation

### Requirement: Distinguish a dragged source and valid destination
While an item drag is active, its originating Inventory row or equipment position SHALL show a departure state. A compatible available equipment position for an Inventory item, or Inventory with capacity for an equipped item, SHALL show a landing state while hovered. Invalid, occupied, incompatible, and full destinations SHALL not show a landing state.

#### Scenario: Hover an empty compatible weapon position
- **WHEN** Wooden Stick from Inventory is over an empty Weapons position
- **THEN** its Inventory row shows departure and that Weapons position shows landing

#### Scenario: Hover Inventory while carrying equipment
- **WHEN** an equipped item is over Inventory with available capacity
- **THEN** its equipment position shows departure and Inventory shows landing

#### Scenario: Hover a rejected destination
- **WHEN** an item is over an incompatible, occupied, or full destination
- **THEN** the source remains marked as departing but the destination has no landing state

### Requirement: Project attributes for a valid equipment transfer
While an Inventory item hovers a compatible available equipment position, the Attributes panel SHALL show the values resulting from enabling that item. While an equipped item hovers Inventory with capacity, it SHALL show the values resulting from removing that item. The projection SHALL clear outside a valid destination and shall not mutate campaign state, resources, saved state, or game time.

#### Scenario: Preview equipping Wooden Stick
- **WHEN** Wooden Stick hovers an empty Weapons position
- **THEN** Attributes show its projected modifier changes until the pointer leaves or the gesture ends

#### Scenario: Preview unequipping an item
- **WHEN** an equipped item hovers Inventory with capacity
- **THEN** Attributes show the projected values after removing that item until the pointer leaves or the gesture ends

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

### Requirement: Clear drag feedback after the gesture
On a valid release, invalid release, release at the source, Escape, pointer cancellation, or loss of the drag gesture, the interface SHALL remove the item preview, departure state, landing state, and projected attributes. Only a valid release SHALL perform the existing equipment transaction.

#### Scenario: Complete a valid equipment drop
- **WHEN** Wooden Stick is released over an empty Weapons position
- **THEN** all transient drag feedback clears and Wooden Stick appears in the position after the equipment transaction commits

#### Scenario: Cancel a drag
- **WHEN** a player presses Escape or the pointer is canceled during an item drag
- **THEN** all transient drag feedback clears and the campaign remains unchanged

### Requirement: Preserve category identity during drag feedback
The pointer-following preview SHALL retain the dragged item's category strip over valid and invalid areas. A valid hovered destination SHALL show an additional outline in its category color. A valid return to Inventory SHALL use the dragged item's category color for that outline. Invalid destinations SHALL retain their resting category cues without a landing outline. Departure styling SHALL preserve category identity without imposing another category's color.

#### Scenario: Drag equipment toward a compatible destination
- **WHEN** an Inventory equipment item hovers a destination accepted by the existing equipment rules
- **THEN** its preview retains blue and the destination shows an additional blue landing outline

#### Scenario: Drag a potion to a Quick Slot
- **WHEN** an Inventory potion hovers a Quick Slot accepted by the existing transfer or stacking rules
- **THEN** its preview retains green and that slot shows an additional green landing outline

#### Scenario: Reorder an ability
- **WHEN** a dragged ability hovers another Ability position accepted by the existing reorder rules
- **THEN** its preview retains purple and that position shows an additional purple landing outline

#### Scenario: Return gear or potions to Inventory
- **WHEN** equipped gear or a Quick Slot stack hovers an Inventory position accepted by the existing capacity rules
- **THEN** that position shows a blue or green landing outline respectively while other empty Inventory positions remain neutral

#### Scenario: Reject a similarly colored equipment destination
- **WHEN** an armor item hovers a Weapons position that rejects it
- **THEN** both retain their blue category strips but no landing outline appears

#### Scenario: End the gesture
- **WHEN** the gesture completes or is canceled
- **THEN** transient preview, departure, and landing feedback clears while resting category strips remain

### Requirement: Mark Drop Item as a destructive landing target
While a transferable object is dragged over Drop Item, the destination SHALL show a red border landing state distinct from ordinary compatible blue, green, or purple landing states.

#### Scenario: Hover Drop Item
- **WHEN** any transferable object is dragged over Drop Item
- **THEN** Drop Item shows the red landing state and the source remains visibly departing

#### Scenario: Leave Drop Item
- **WHEN** the dragged object leaves Drop Item without release
- **THEN** the red landing state clears and no drop is committed
