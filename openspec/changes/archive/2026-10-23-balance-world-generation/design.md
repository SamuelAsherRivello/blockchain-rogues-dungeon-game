# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The current generator creates a 100-by-100 floor, places enemies through room iteration, and derives potion/key/gold counts from visible-screen density. The existing enemy catalog has eight ranked definitions, while world-droppable content is assembled in the procedural system. The current Level 1 barrel/trigger/door object set is a trigger puzzle and does not consume keys.

## Goals / Non-Goals

**Goals:**

- Make ordinary floor content legible and sparse while retaining deterministic variety.
- Centralize unlock, rarity, budget, and key/door rules so generation passes consume one balance contract.
- Preserve the existing test-mode showcase behavior as an explicit development exception.
- Keep keyed-door solvability independent from trigger-puzzle mechanics.
- Produce diagnostics suitable for focused statistical tests and later tuning.

**Non-Goals:**

- Adding new enemy characters, inventory items, door art, or NPC types.
- Replacing the existing world-generation pass pipeline.
- Changing combat statistics, player progression, inventory capacity, or renderer behavior.
- Making keys door-specific; all keyed doors use the existing generic key counter.

## Decisions

### Use a balance profile separate from map geometry

Derive a seeded balance profile from dungeon level, run difficulty, world attributes, and test flags before placement. The profile exposes eligible item and enemy definitions, rarity weights, per-floor budgets, keyed-door minimums, and surplus-key chance. Placement then consumes those budgets after walkable cells and semantic objects are known.

Alternative considered: keep independent constants inside each placement loop. Rejected because item, enemy, trap, and key changes would drift apart and be difficult to test as one balance contract.

### Replace full-map pickup density with bounded budgets

Retain seeded random selection, but calculate ordinary content from level budgets rather than `floorArea / visibleScreenArea`. World attributes may apply a bounded multiplier to budgets and rarity, with hard floors and ceilings preserving the table's intended shape. This prevents a large map from multiplying supplies without limit.

Alternative considered: merely reduce the existing density constants. Rejected because the current area-based model still scales poorly across map sizes and cannot express “one to three total potions” cleanly.

### Gate definitions before rolling rarity

Filter the item and enemy catalogs by level first, then roll among eligible entries using rarity and tuning weights. The current eight enemies use rank thresholds of 2, 4, 6, 7, and 8 at Levels 1–5; a future roster can extend the same rank schedule without changing the contract.

Alternative considered: allow every definition at every level with lower probability. Rejected because powerful content would appear too early and the user-visible progression would be unpredictable.

### Count keyed doors after semantic placement

Place and classify doors after walkable geometry is available. Count only explicitly keyed, blocking doors; exclude trigger-only Floor Trigger Door Barrel Sets. Allocate one universal key per counted door, then perform one bounded surplus roll whose probability increases with level and run difficulty and is capped at 30%.

Alternative considered: assign keys before doors or use door-specific key identities. Rejected because keys could become unreachable or require a new identity model that the current generic key counter does not support.

### Keep test showcases outside normal budgets

The existing `level1ObjectTestMode` and `level1EnemyTestMode` branches remain separate from normal placement. They reserve nearby cells for showcase objects and enemies, suppress ordinary duplicates in the affected category, and activate only when `level === 1`.

Alternative considered: increase normal budgets when test flags are enabled. Rejected because test content would contaminate balance tests and later debugging comparisons.

### Record generation diagnostics for tuning

Extend world-generation diagnostics or focused test helpers with actual counts, eligible roster names, keyed-door count, key count, and budget-profile inputs. This gives balance tests a stable observation point without coupling the renderer to generation internals.

## Risks / Trade-offs

- [Risk] Sparse floors may feel empty on seeds with long traversal routes. -> Preserve guaranteed core recovery and key coverage, then tune bounded budgets using multi-seed reports.
- [Risk] A keyed door may partition the only route to its own key. -> Place the required key on a reachable pre-door region and validate reachability before activation.
- [Risk] World attributes could recreate overpopulation. -> Clamp attribute multipliers and validate actual counts against hard per-level ceilings.
- [Risk] Existing saves contain floors generated under older counts. -> Keep saved floor contents authoritative; apply the new profile only to newly generated floors and record a balance-rule version for regenerated floors.
- [Risk] Future enemy additions could make Level 5 unexpectedly crowded. -> Separate roster eligibility from encounter count and retain the floor enemy cap.

## Migration Plan

1. Add the balance profile and catalog gates without changing save schemas for existing active floors.
2. Generate new floors with the bounded profile and preserve existing test flags in generation profiles.
3. Add deterministic multi-seed reports covering levels 1–10, world-attribute extremes, and run difficulties.
4. If a generated floor is loaded from an existing save, keep its serialized entities and decorations unchanged; use the new profile only when generating a new floor or explicitly regenerating a base.
5. Bump the balance-rule version when changing unlocks, budgets, or key logic so future migrations can distinguish profiles.

## Open Questions

- Exact bounded multipliers for each world attribute can be tuned from multi-seed reports without changing the level gates or key invariant.
- The final keyed-door entity type and visual presentation can be added later; this change defines its generation accounting, not its renderer.
