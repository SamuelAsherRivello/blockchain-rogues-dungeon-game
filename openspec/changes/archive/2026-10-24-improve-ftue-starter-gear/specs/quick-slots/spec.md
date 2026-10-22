# Spec Delta

## MODIFIED Requirements

### Requirement: Render two neutral Quick Slots
The game SHALL render a Quick Slots panel beneath Abilities with exactly two full-width rows. A newly created or post-death replacement run SHALL initialize both positions empty. Each row SHALL retain its existing positional label and show either a centered empty `+` marker or the quick-slotted item name with its positive quantity. Filled and empty rows SHALL use the green Quick category strip instead of neutral-only styling or the purple Ability accent. Unavailable activation content SHALL retain its disabled treatment independently of the strip.

#### Scenario: Show empty Quick Slots
- **WHEN** a new campaign or post-death replacement run begins with no quick-slotted items
- **THEN** both rows show a green left strip, their existing positional labels, and a centered `+` marker without zero-quantity text

#### Scenario: Show a populated stack
- **WHEN** Mana Potion quantity 2 occupies the second Quick Slot
- **THEN** that row shows Mana Potion and quantity 2 with a green category strip
