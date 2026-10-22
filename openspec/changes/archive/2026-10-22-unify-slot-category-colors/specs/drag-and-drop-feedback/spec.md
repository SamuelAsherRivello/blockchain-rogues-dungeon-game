# Spec Delta

## ADDED Requirements

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
