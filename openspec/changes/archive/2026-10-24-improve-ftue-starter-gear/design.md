# Design

## Context

See [proposal.md](proposal.md) for motivation. The campaign factory in `world-procedural-system.ts` currently seeds an equipped Wooden Stick, potions, capacity, bound abilities, and counters. That same module owns the item catalog, normalized inventory capacity, deterministic floor placement, and the combat action. `game.tsx` owns drag presentation and begins the enemy bump animation before dispatch; `battle-overlay.tsx` owns the timed Battle entry/settled transition. The item sprite sheet has a fixed atlas mapping and an unused frame suitable for a new vest.

## Goals / Non-Goals

**Goals:**

- Preserve deterministic world generation while making the starter pack an explicit production-floor phase.
- Keep combat authority in the game-rule system, with the React layer preventing misleading unarmed animation and feedback.
- Use a single transferable comparison model for Equipment, Quick Slot, Ability, and discard previews.
- Keep saved campaigns loadable after renamed/reshaped inventory data.

**Non-Goals:**

- Retune every Level One enemy or the full reward rarity model.
- Change test-fixture layouts, add tutorial persistence/dismissal, or add new ability acquisition mechanics.
- Add additional equipment positions or a new renderer.

## Decisions

### Treat starter placement as a named generation phase

For a normal World One, Level One generation, reserve two reachable cells in the ten-tile start radius before ordinary pickup placement. Use the existing seeded random source to choose the potion and cells, record those reservations, and exclude ordinary pickup placement from them and the protected start area. The two guaranteed items consume the Level One potion and world-item budgets, so their totals remain within the existing sparse-floor contract. Test flags skip the phase entirely. This makes the exact pack stable for a seed and prevents ordinary rolls from silently producing another starter item near the player.

The alternative is to seed the starter items in the campaign Inventory or to graft them onto object-test fixtures. Inventory bypasses the requested pickup/assignment loop, while fixtures are intentionally isolated from production balance.

### Represent net capacity, not a special stack quantity

Keep capacity as an ordinary non-stackable Inventory item with a one-entry footprint. Rename the catalog identity to `Extra Carrying Capacity +5`, set its stored capacity contribution to six, and derive the displayed `+5` net effect from its one occupied entry. Centralize this projection with other item effects so slot rows and comparison panels use the same carrying-capacity icon and value.

The alternative is to store `+5` and exempt the item from capacity counting. That would introduce a hidden exception and would not accurately express that the item itself occupies space.

### Separate rule validation from battle UI feedback

Expose a shared `hasAttackCapableWeapon` predicate based on assigned offensive weapon data. The procedural game action rejects an unarmed adjacent enemy bump before time, resource, or enemy-phase mutation. React consults the same state to keep adjacent clicks animation-free, select forbidden cursor/black-box feedback, and still permit path movement toward a distant target.

The alternative is a UI-only guard. It would leave keyboard and future callers able to invoke invalid attacks, so authority remains in the rule layer.

### Drive the reminder from Battle presentation settlement

Make the Battle indicator report its settlement event to the parent world view. The parent creates transient Tip state only when Battle has just entered and no attack-capable weapon exists; leaving Battle clears it. No save field, local-storage dismissal state, or tutorial completion state is introduced. Each later unarmed entry repeats the message.

The alternative is to show the panel at Battle detection. That races the entry banner and violates the requested presentation order.

### Generalize comparison as a transition preview

Replace the Equipment-only comparison input with a transition descriptor containing source, destination, before, after, and projected effects. Valid drop destinations provide descriptors, including an explicit empty item for discard. Invalid targets remain without comparison. Use normal in-flow spacing/legend treatment for the two inner comparison cards so their labels cannot be clipped by the shared card's overflow behavior.

The alternative is destination-specific comparison components. It would duplicate capacity-effect handling and let presentation drift among targets.

### Add the vest through the existing atlas pipeline

Draw one original 32-pixel wooden chest-only sprite in the unused droppable atlas frame, map `Wooden Vest` through the existing item-to-frame table, and record the supplied sprite pack provenance alongside the edited asset. The underlying item remains standard one-position armor, so no new equipment rules are required.

The alternative is to reuse the Suit of Armor frame. That would visually contradict the chest-only requirement.

## Risks / Trade-offs

- [Nearby cells may not meet placement constraints on an unusual seed] → select from reachable candidates after terrain generation and fail the generation test rather than placing an unreachable starter item.
- [Old saves contain `Extra Space`] → normalize that supported legacy name to the renamed non-stackable capacity item without deleting other campaign data.
- [Ability comparison represents a non-stat transfer] → render a clear zero-effect transition instead of inventing attribute changes.
- [A weapon group can contain defensive equipment] → define attack-capable from its offensive capability, rather than treating every group occupant as a weapon.
- [Sprite-atlas edits can shift neighboring frames] → retain atlas dimensions, edit only the unused frame, and inspect the focused browser scene after rendering changes.

## Migration Plan

1. Normalize supported loaded campaigns to the new capacity item name and contribution while preserving their carried items and valid positive quantities.
2. Apply new empty defaults only to newly created and post-death runs; do not erase existing saved equipment, abilities, or Quick Slots merely because the default changed.
3. Validate deterministic generation, pure rules, and focused UI behavior before release. If the new release must be rolled back, prior saves remain readable because the normalizer accepts the legacy capacity-item name.
