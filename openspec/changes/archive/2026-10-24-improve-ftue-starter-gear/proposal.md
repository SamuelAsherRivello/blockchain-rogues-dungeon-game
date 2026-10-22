# Proposal

## Why

The opening run currently gives the player equipped gear, consumables, capacity, and bound actions before they have learned how to acquire and assign them. The revised opening should begin empty, place a deliberately small and readable starter pack nearby, and prevent a player from accidentally attempting unarmed combat without clear, repeatable guidance.

## What Changes

- Start every newly created or post-death run with no Inventory items, equipped items, Quick Slot items, or ability bindings; set base Inventory capacity to five and start resource counters at zero.
- Add a production World One, Level One starter-pack placement: exactly one Wooden Stick and exactly one randomly selected Health Potion or Mana Potion on reachable cells within ten tiles of the start. The placement is deterministic for a seed, excluded from test fixtures, and does not create extra starter-pack items.
- Rebalance Wooden Stick to be the weakest weapon (`+1` Offense) and introduce `Wooden Vest`, a Level One wooden chest-only armor item with a distinct wooden-vest world sprite and `+1` Defense.
- Rename and redesign the capacity item as `Extra Carrying Capacity +5`: it occupies one Inventory entry, grants six capacity internally, is non-stackable, and therefore yields five additional usable carrying positions. Its rows and comparisons show a dedicated carrying-capacity icon and `+5` effect.
- Expand drag comparison feedback to all valid assignment targets and discards. A drop preview compares an item to empty and reports the net loss; Quick Slot and Ability transfers show before/after comparison even when either position is empty. Repair the clipped `Before` comparison label.
- When Battle settles with no assigned weapon, show an in-world `Tip` panel every qualifying Battle entry with subject `Battle Mode` and body `Assign a weapon, or you cannot fight.`
- Reject unarmed enemy attacks in both the input and game-rule paths. An unarmed detected enemy receives forbidden cursor and black target-box feedback; clicking from range may move the player closer, but an adjacent bump does not attack, animate a bump, advance time, or alter combat state.
- Update user-facing guidance and saved-campaign normalization so the new defaults and capacity item remain understandable and compatible with existing campaigns.

## Capabilities

### New Capabilities

- `battle-mode-guidance`: Present repeatable, post-settlement in-world advice for an unavailable Battle action.

### Modified Capabilities

- `combat-resolution`: Replace the equipped starter-weapon opening assumption with explicit unarmed-combat rejection and a weak acquired starter weapon.
- `contextual-mouse-cursors`: Describe forbidden cursor and black target feedback for an unarmed detected enemy.
- `drag-and-drop-feedback`: Require comparison feedback for valid Quick Slot, Ability, and discard destinations as well as Equipment.
- `inventory-management`: Change base capacity, capacity-item semantics and presentation, item comparison, and initial Inventory/equipment state.
- `player-abilities`: Change new-run bindings from prefilled abilities to four empty positions.
- `quick-slots`: Retain two empty slots but make the empty state an explicit new-run default.
- `world-generation-balance`: Add the deterministic production-only Level One starter pack and Level One Wooden Vest eligibility.

## Impact

- Affected game rules and data normalization: new-run creation, death resets, item catalog/capacity arithmetic, deterministic floor placement, combat dispatch, campaign migration, and tests.
- Affected React/UI/rendering: Battle indicator lifecycle, tip panel, cursor/reticle state, drag-preview comparison layout, capacity iconography, item rows, How to Play guidance, sprite atlas mapping, and styles.
- No network, account, or external API changes. Playwright provides useful evidence for the browser-visible tip, unarmed target feedback, and comparison-panel layout; it will be run as one focused post-UI implementation check, with the normal applicable suite reserved for finalization.
