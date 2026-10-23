# Proposal

## Why

Normal dungeon floors currently scale pickup counts across the full generated map and attempt enemy placement per room, making zoomed-out floors feel crowded with items, gold, and enemies. The game needs an explicit ten-level balance model that gates stronger content, reduces ordinary density, preserves deterministic generation, and reserves excessive near-entrance placement for Level 1 test modes only.

## What Changes

- Replace broad area-scaled normal loot expectations with level-aware budgets for potions, gold, keys, world items, rewards, enemies, traps, and recovery objects.
- Define first-appearance levels and rarity bands for the current world-droppable items, with stronger or more rewarding items arriving later and rolling less often.
- Gate enemy availability by dungeon level: the first two enemy ranks on Level 1, the first four on Level 2, the first six on Level 3, the first seven on Level 4, and all currently catalogued enemies by Level 5.
- Cap ordinary enemy counts independently from room count so room generation does not imply one encounter per room.
- Preserve Level 1 object-test and enemy-test modes as explicit showcase exceptions that place extra content near the entrance and do not affect normal generation or later levels.
- Define keyed-door accounting separately from trigger-only puzzle doors. Every explicitly keyed door SHALL have at least one universal key, and generated keys SHALL satisfy `keyCount >= keyedDoorCount`.
- Scale surplus keys conservatively from dungeon level and run difficulty: one key per keyed door by default, with a bounded chance for one additional key on later or harder floors.
- Keep all generation seeded and deterministic, including content gates, rarity rolls, budgets, key counts, and placement order.

## Capabilities

### New Capabilities

- `world-generation-balance`: Defines level-based content unlocks, rarity, normal-floor budgets, test-mode exceptions, encounter pacing, and keyed-door/key solvability invariants.

### Modified Capabilities

- None. Existing dungeon puzzle object sets remain trigger-driven and are not reclassified as keyed doors by this change.

## Impact

- Affected generation logic in `rogues-dungeon/src/systems/procedural/world-procedural-system.ts` and world tuning in `world-attributes.ts`.
- Affected enemy availability in `rogues-dungeon/src/content/enemies/enemy-catalog.ts`.
- Affected serialized generation profiles and diagnostics if balance-rule versions or budget summaries are recorded.
- Affected focused Node tests for deterministic generation, enemy unlocks, item rarity, content budgets, test modes, and key/door invariants.
- Browser-visible behavior changes only through generated floor content; one muted focused Edge/Playwright check is useful after implementation, with the full applicable suite reserved for finalization.
