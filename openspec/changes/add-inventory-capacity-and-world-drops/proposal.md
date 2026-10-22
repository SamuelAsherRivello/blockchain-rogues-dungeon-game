# Proposal

## Why

Inventory is currently the primary holding area for equipment and consumables, but abilities cannot enter it and there is no deliberate way to return a carried item to the dungeon. Adding a capacity-expanding inventory item and a universal Drop Item destination will make Inventory the master staging area while preserving the existing equipment, ability, and quick-slot destinations.

The current project baseline is 10 inventory slots. This proposal assumes that baseline remains unchanged: Extra Space occupies one carried slot and increases effective capacity by five, producing 15 capacity while it is carried. This is an explicit planning assumption to revisit before implementation if the intended baseline is 8.

## What Changes

- Add an Extra Space inventory item that is included in the starter pack, occupies one inventory slot, and grants +5 effective capacity while present.
- Make inventory capacity calculations consistent for collection, stacking, equipment transfers, quick-slot transfers, saves, and display counts.
- Add a non-draggable Drop Item row below the final inventory slot. It accepts valid drags from Inventory, Equipment, Quick Slots, and Abilities, shows a red landing state, and drops the committed item into the world.
- Allow abilities to move through Inventory while retaining positional ability assignment and activation rules when they are placed back into ability slots.
- Make Inventory the common source and destination for compatible transfers among Equipment, Quick Slots, Abilities, and the world-drop destination.
- Spawn dropped items at a player-adjacent upper-left or upper-right world cell using the existing parabolic item-throw presentation, with deterministic fallback when a preferred cell is unavailable.
- Render dropped equipment, abilities, consumables, and Extra Space as identifiable world objects that can be collected again.
- Add an approved asset inventory for every droppable item representation. Reuse the existing Health Potion, Mana Potion, and coin artwork; author new representations for the remaining droppable entries before adding them to the selected Tiled tileset.
- Persist dropped item entities and their item identity through campaign save and reload behavior.
- Publish structured events for dropped items, rejected drops, and recollection without coupling gameplay rules to HUD text.

## Capabilities

### New Capabilities

- `world-item-drops`: Defines universal inventory/equipment/ability/quick-slot drops, adjacent world spawning, recollection, presentation, and droppable-item asset coverage.

### Modified Capabilities

- `inventory-management`: Adds effective capacity modifiers, the Drop Item destination, and ability entries in Inventory.
- `drag-and-drop-feedback`: Adds red Drop Item landing feedback and cross-panel drag-source rules.
- `player-abilities`: Allows abilities to leave ability positions for Inventory and return to positional bindings.
- `quick-slots`: Allows quick-slotted stacks to be dropped into the world through Inventory.
- `world-map-rendering`: Renders all dropped item types and their throw/settled presentation in the shared world pass.
- `campaign-saves`: Persists Extra Space state and dropped world item entities.
- `game-events`: Publishes structured drop, rejection, and recollection outcomes.

## Impact

- Domain contracts and action resolution in `rogues-dungeon/src/game/types.ts` and `src/systems/procedural/world-procedural-system.ts`.
- React drag routing and slot presentation in `src/game/game.tsx`, `src/game/inventory-drag.ts`, and the information-panel components.
- World object rendering and throw animation in the Babylon Lite renderer and animation systems.
- Item catalog, ability catalog, save migration, event/log policy, and focused tests.
- New item/ability world art and selected Tiled tileset metadata after the representation list is approved. The specific tileset remains an implementation decision pending that approval.
- Playwright adds useful evidence for red Drop Item feedback, cross-panel drag behavior, world spawning, recollection, and browser-visible rendering. Proposal does not run it; Apply should run one focused muted Edge check after the related implementation group, with broader coverage reserved for finalization.
