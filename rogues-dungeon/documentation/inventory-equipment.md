# Inventory and equipment

New campaigns carry up to 5 unequipped items before carrying-capacity bonuses. Ordinary world loot is collected directly into Inventory, displayed alphabetically by name then stable item ID. Equipped items do not count toward the Inventory total. A full Inventory leaves ordinary loot in its world position while movement continues.

Equipment has two Weapons, two Armor, and two Jewels positions, shown in that order. Swords and shields share Weapons; armor items use Armor. Any ring, bracelet, or amulet fits either Jewel position. Dropping compatible gear onto an occupied position swaps it with the Inventory item. Incompatible groups reject drops. Equipment changes are atomic and cost one game tick only when accepted. Unequipping requires an available Inventory position. Reordering within one group is cosmetic and does not change combined modifiers.

Attribute preview is a pure projection shown only while a compatible item is over a usable equipment position. It clears on leaving the target, cancellation, invalid drop, or drag end. It never changes campaign or saved state before a valid drop commits.

## Jewels

Each Jewel uses one Inventory entry while carried and one Jewel position while worn. Instances never combine into quantity stacks. You may wear two rings, two bracelets, two amulets, or any mixed pair, including two separate copies of the same item. Their listed bonuses add once per instance. There are no pair bonuses, charges, activation keys, or Mana costs. Stored and dropped Jewels grant no buffs; Abilities and Quick Slots reject them.

| Jewel | Family | Loot tier | Buff while equipped |
| --- | --- | --- | --- |
| Copper Ring of Vigor | Ring | Low | Maximum Health +5 |
| Silver Ring of Vigor | Ring | Middle | Maximum Health +10 |
| Gold Ring of Vigor | Ring | High | Maximum Health +15 |
| Copper Guard Bracelet | Bracelet | Low | Defense +1 |
| Silver Guard Bracelet | Bracelet | Middle | Defense +2 |
| Gold Guard Bracelet | Bracelet | High | Defense +3 |
| Quartz Amulet | Amulet | Low | Maximum Mana +5 |
| Sapphire Amulet | Amulet | Middle | Maximum Mana +10 |
| Star Sapphire Amulet | Amulet | High | Maximum Mana +15 |
| Prismatic Amulet | Amulet | Special | Maximum Health +5 and maximum Mana +5 |

These values are resource points, not progression ranks or percentages. Loot tier describes rarity and progression, not a vendor price. Equipping or removing Health/Mana capacity preserves resource fullness. For example, adding Health +5 at 10/20 Health produces 12.5/25 Health, rather than a potion refill. Defense uses the existing combat calculation and Stamina readiness. Two Gold Rings add maximum Health +30; two Star Sapphire Amulets add maximum Mana +30; two Gold Guard Bracelets add Defense +6.

## Ability and quick-slot swaps

Dragging a compatible Inventory item over an Ability or Quick Slot shows a Before/After comparison and highlights the destination. Ability comparisons show effects and Mana cost. Quick-slot comparisons show stack quantities. Releasing commits the change; Escape or dropping outside a compatible slot cancels it.

Replacing an assigned ability returns the previous ability to Inventory. Replacing a quick-slot item returns its entire stack to Inventory, combining it with a matching stored stack. Dragging between occupied Ability slots or between occupied Quick Slots swaps their contents. Matching quick-slot items combine their quantities. Accepted changes cost one game tick.

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
