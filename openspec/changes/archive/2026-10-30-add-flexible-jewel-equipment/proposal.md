# Proposal

## Why

Equipment currently offers two Weapons positions and two Armor positions. Two flexible Jewel positions add useful passive equipment choices while preserving the current sidebar layout, Abilities, and consumable Quick Slots.

## What Changes

- Add a `Jewels` section directly below Armor, with exactly two interchangeable, full-width equipment rows. Rings, bracelets, and amulets fit either row, including two separate copies of the same item. There are no pair bonuses, anatomical restrictions, activation keys, charges, or new panels.
- Add the ten agreed items with their exact base buffs: three Vigor rings giving maximum Health +5/+10/+15, three Guard bracelets giving Defense +1/+2/+3, Quartz/Sapphire/Star Sapphire amulets giving maximum Mana +5/+10/+15, and Prismatic Amulet giving maximum Health +5 and maximum Mana +5.
- Give every item complete catalog, runtime identity, compatibility, comparison, persistence, generation, and graphic registration. Jewelry uses the existing blue Equipment category, one Inventory entry, one equipment position, and non-stackable instances.
- Apply buffs only while equipped; preserve resource fullness when maximum Health or Mana changes. Keep existing atomic equip/swap/unequip/reorder/drop behavior, one-tick accepted loadout changes, and free cancellation or rejected actions.
- Add ordinary generation and chest/crate rewards through existing seeded pickup/reward passes and budgets. Introduce a bounded 25% Jewel channel within successful ordinary item/reward selections, explicit level gates, and weighted Jewel tiers. Preserve existing starter supplies and non-Jewel reward rules. Jewel buffs remain the catalog values for every source rather than receiving container quality or Luck amplification.
- Create ten distinct, finished item graphics and connect them to naturally generated loot, container release, player drop throws, settled pickups, and world-to-Inventory transfer. Extend the existing droppable atlas without changing its twelve existing frame identities or artwork.
- Persist equipped, carried, container-held, and ground Jewel instances through the existing save/recovery paths. **BREAKING for development saves:** update the balance version and the game's existing compatibility epoch because changed seeded item selection changes regenerated floor baselines. The authorized development reset is limited to the `rogues-dungeon.` namespace and runs once per epoch; supported records within the new epoch retain normal save behavior.
- Update item/equipment documentation, asset provenance, and regression coverage. Add no enemy loot mechanic, vendor prices, crafting, sockets, durability, set bonuses, or equipped character sprite overlays.

## Capabilities

### New Capabilities

- `jewel-equipment`: Ten fixed-bonus Jewel definitions, flexible worn-item semantics, instance identity, and presentation completeness.

### Modified Capabilities

- `inventory-management`: Three compatible equipment groups, Health-aware comparisons, and the additional Jewel rows in the current layout.
- `world-generation-balance`: Bounded Jewel reward selection, per-item unlocks and rarity, fixed modifiers, and deterministic normal placement.
- `world-item-drops`: Identifiable graphics and lossless collect/equip/drop/recollect behavior for all ten Jewels.
- `campaign-saves`: Jewel group normalization, round-trip identity and modifiers, recovery behavior, and development compatibility handling.

## Impact

- Domain/UI: `rogues-dungeon/src/game/types.ts`, `game.tsx`, `inventory-drag.ts`, `item-comparison-stats.ts`, existing information panels, slot palette, and equipment/Inventory styles.
- Rules/generation: `world-procedural-system.ts`, `world-balance.ts`, generation profiles, compatibility epoch, save normalization, and death-recovery snapshots.
- Art/rendering: `world-object-sprite-system.ts`, Babylon droppable atlas setup, DOM pickup-transfer cropping, throw rendering, the droppable item sprite sheet, and asset provenance. No new renderer or production dependency is required.
- Nearby tests include inventory/equipment actions, world balance, sprite frames, pickup transfers, saves/recovery, and browser equipment swaps. Coordinate with the active world-generation and lockbox work without incorporating or reverting it; any generic item-container path present at apply time must preserve Jewel identity and buffs.
- Acceptance requires all ten items to be reachable through production loot rules, correctly rendered and collectible, usable in either Jewel position, rejected by incompatible destinations, and lossless through drop/recollect/reload. Inventory count and Abilities/Quick Slots retain their current behavior.
- Browser evidence is useful for row layout, pointer compatibility, native-size art, drop throws, transfers, portrait and fullscreen. Plan one focused post-implementation check, then the full applicable suite and required Edge CLI, desktop Edge, and in-app browser verification at finalization. Do not launch browsers during this proposal.
