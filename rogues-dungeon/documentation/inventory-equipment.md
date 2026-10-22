# Inventory and equipment

New campaigns carry up to 10 unequipped items. Ordinary world loot is collected directly into Inventory, displayed alphabetically by name then stable item ID. Equipped items do not count toward the Inventory total. A full Inventory leaves ordinary loot in its world position while movement continues.

Equipment has two Weapons and two Armor positions. Swords and shields share the Weapons group; armor items use Armor. Occupied destinations and incompatible groups reject drops. Equipment changes are atomic and cost one game tick only when accepted. Unequipping requires an available Inventory position. Reordering within one group is cosmetic and does not change combined modifiers.

Attribute preview is a pure projection shown only while a compatible item is over a usable equipment position. It clears on leaving the target, cancellation, invalid drop, or drag end. It never changes campaign or saved state before a valid drop commits.

## Slot category colors

The shared palette in `src/ui/slot-colors.ts` supplies these colors to the slot UI and status-bar shortcuts.

| Category | Color | Where it appears |
| --- | --- | --- |
| Ability | Purple `#c0aaff` | Filled and empty Ability strips, ability previews, valid reorder outlines, available numbered shortcuts |
| Quick | Green `#79c878` | Potion Inventory strips, filled and empty Quick strips, previews, valid drop outlines, available Q/E shortcuts |
| Equipment | Blue `#67b7e8` | Gear Inventory strips, filled and empty Weapons/Armor strips, previews, valid drop outlines |

Each occupied Inventory row has a 1px vertical strip at its left edge. Both rows of gear that occupies two positions share the same color. Potion colors identify Quick compatibility regardless of whether the potion restores Health or Mana. Empty Inventory positions stay neutral; a valid return drag outlines only its destination with the dragged item's category color.

A strip identifies a category, not a currently legal drop or available activation. Weapons and Armor share blue but still require compatible groups. A valid hovered destination gains a separate outline; incompatible targets do not. Unavailable abilities and potions retain their category strips while their action content remains gray. Canceling a drag removes transient feedback and leaves resting strips visible.

Names, group labels, dark row fills, and neutral text provide context alongside color. Status-bar Ability and Quick accents reuse the palette; movement, resource meters, and positive/negative stat feedback retain their separate meanings.
