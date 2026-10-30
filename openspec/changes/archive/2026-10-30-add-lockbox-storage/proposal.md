# Proposal

## Why

The two lockboxes in the player home currently provide blocked decoration without usable storage. Players need a way to store items outside their carried inventory and keep those items through travel, reloads, and death, with placement controlled by the human-authored prefab.

## What Changes

- Recognize human-authored `lockbox` tile objects in prefabs as blocking interactables. Preserve the existing left and right home placements and art. Remove their independent hard-coded placement and walkability entries; do not add procedural distribution, test-mode spawning, or automatic replacement objects.
- Open a `Lockbox` window when the player bumps a lockbox. Match the in-game Settings dimensions and center it on both axes of the available game view. Include the heading and X close button, darken the world view, and pause gameplay and world input while allowing inventory transfers.
- Parameterize the shared inventory rows with contents, capacity, container identity, and Drop Item visibility. The shared inventory begins empty, has exactly ten capacity positions, and omits Drop Item, with previously persisted canonical overflow temporarily withdrawable. Preserve the ordinary Inventory presentation and default behavior.
- Support atomic whole-item or whole-stack drags between the player's Inventory and the open lockbox. Reject invalid, full, cancelled, or capacity-reducing transfers without item loss, duplication, world drops, or a time cost. Preserve item identity, quantities, multi-position occupancy, category colors, and applicable player capacity rules.
- Give every authored lockbox the storage ID `shared-lockbox`. Each opens the same ten-position inventory within its Saved Game across dungeon levels, reloads, and every death mode. Different Saved Games remain separate. Classic still ends its active campaign; a new character in that same Saved Game can access its retained shared storage. Reset legacy independent contents once as the user requested. Preserve already-canonical shared contents, including any previously retained overflow.
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

The latest user decision is one connected ten-position store per Saved Game, accessible through every manually authored lockbox. Whole-stack transfers retain the user's selected row, and X/Escape dismiss with cancellation of any active drag. The user answered the migration question with "Reset existing lockbox contents". Legacy placement-specific contents reset once; existing canonical shared storage remains intact. Existing Tiled placements and blocking geometry were verified live and remain unchanged. The separately discussed refresh-duplication issue remains read-only analysis, outside this implementation.
