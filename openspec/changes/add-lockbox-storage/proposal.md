# Proposal

## Why

The two lockboxes in the player home currently provide blocked decoration without usable storage. Players need a way to store items outside their carried inventory and keep those items through travel, reloads, and death, with placement controlled by the human-authored prefab.

## What Changes

- Recognize human-authored `lockbox` tile objects in prefabs as blocking interactables. Preserve the existing left and right home placements and art. Remove their independent hard-coded placement and walkability entries; do not add procedural distribution, test-mode spawning, or automatic replacement objects.
- Open a `Lockbox` window when the player bumps a lockbox. Match the in-game Settings dimensions and center it on both axes of the available game view. Include the heading and X close button, darken the world view, and pause gameplay and world input while allowing inventory transfers.
- Parameterize the shared inventory rows with contents, capacity, container identity, and Drop Item visibility. Lockboxes begin empty, have exactly ten capacity positions each, and omit Drop Item. Preserve the ordinary Inventory presentation and default behavior.
- Support atomic whole-item or whole-stack drags between the player's Inventory and the open lockbox. Reject invalid, full, cancelled, or capacity-reducing transfers without item loss, duplication, world drops, or a time cost. Preserve item identity, quantities, multi-position occupancy, category colors, and applicable player capacity rules.
- Keep the two lockboxes independent within each Saved Game. Their contents follow stable authored object identities across dungeon levels, reloads, and every death mode. They are neither level-specific nor shared between Saved Games. Classic still ends its active campaign; a new character in that same Saved Game can access its retained lockboxes.
- Save both sides of a transfer immediately, even though time is paused. Keep lockbox ownership outside rewindable recovery state so Journey checkpoints cannot recreate deposited items or undo withdrawals. Complete deterministic URL inspection sessions use isolated in-memory lockboxes and do not access Saved Game storage.

## Capabilities

### New Capabilities

- `lockbox-storage`: Human-authored blocking lockboxes, their paused ten-position storage window, bidirectional transfers, and stable per-Saved-Game container identity.

### Modified Capabilities

- `inventory-management`: Make Drop Item and inventory capacity configurable for the shared container presentation while retaining the player Inventory defaults.
- `campaign-saves`: Persist lockboxes and committed transfers independently of active-run lifetime, initialize missing storage empty, and preserve inspection-session isolation.
- `death-recovery-modes`: Preserve persistent lockboxes through Classic termination and Adventure/Journey recovery, with explicit ownership reconciliation when restoring a checkpoint.
- `dungeon-turns`: Treat lockbox opening, closing, and storage transfers as zero-turn interactions and block world actions while the window is open.

## Impact

- Authored assets: `rogues-dungeon/public/assets/art/game-view/maps/prefabs/player-home.tmx`, its existing `objects-overlay.tsx` tileset, and any existing Tiled class declarations needed for the reusable object contract. Inspect and, only if necessary, edit these through live Tiled MCP during apply. Reuse the supplied art without creating a new image or placing more lockboxes.
- Prefabs and simulation: `prefab-system.ts`, `world-procedural-system.ts`, `game/types.ts`, `game/gridless-interaction.ts`, collision/pathfinding integration, and a focused lockbox transaction module.
- UI: inventory rendering currently inside `game/game.tsx`, `game/inventory-drag.ts`, memoization and pointer handling, a lockbox window, the shared dialog presentation, and `ui/style.css`. Any modified filename that violates repository naming rules must be renamed with its imports updated, including `ui/Dialog.tsx` if changed.
- Persistence: `save-system.ts`, campaign compaction/restoration, save summaries, death paths, and a versioned per-Saved-Game storage record that commits inventory and lockboxes together. No accounts, services, new dependencies, or change to the number of Saved Games.
- Verification: test the authored object path, capacity and transaction rules, atomic save failures, slot isolation, all death modes, and checkpoint ownership. Playwright provides useful evidence for collision, pause, geometry, drag, reload, and responsive behavior. Run no browser checks during proposal. During apply, use one focused Edge Playwright CLI run after the related implementation group and complete the required desktop Edge and in-app browser checks on the same owned server. Reserve the full applicable browser suite for finalization.

Confirmed decisions are the two separate ten-position lockboxes per Saved Game, retained through levels, reloads, and deaths. Proposed implementation defaults are whole-stack transfers, alphabetical rows following Inventory, and X/Escape dismissal with cancellation of any active drag. There are no unresolved scope decisions. Live Tiled authoring verification remains an apply prerequisite because the exploration returned no connected editor session.
