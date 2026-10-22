# Tasks

## 1. Domain contracts and capacity

- [x] 1.1 Extend serializable item, ability, world-entity, action, destination, event, and migration contracts for Extra Space and world drops; verify typecheck and save-normalization tests cover old and new shapes.
- [x] 1.2 Implement derived inventory capacity and starter-pack seeding for Extra Space; verify focused domain tests show 10 base capacity, 15 effective capacity while carried, and safe rejection when removing it would overfill Inventory.
- [x] 1.3 Update collection, stacking, equipment returns, quick-slot returns, and visible Inventory counts to use the derived capacity; verify existing inventory and quick-slot unit tests remain green.

## 2. Atomic world-drop rules

- [x] 2.1 Implement the world-drop action with deterministic adjacent-cell selection, terrain/entity validation, source removal, quantity handling, recollection, and rejection outcomes; verify unit tests cover preferred-cell, fallback-cell, blocked-cell, and canceled cases.
- [x] 2.2 Publish structured drop, rejection, and recollection events and preserve them through Log projection; verify event tests assert item identity, quantity, source/destination, world position, outcome, and game time.
- [x] 2.3 Persist dropped entities and Extra Space state through campaign save/load and level-state restoration; verify a focused save test reloads a dropped item at the same cell with the same quantity.

## 3. Cross-panel drag and UI feedback

- [x] 3.1 Extend drag routing so abilities can enter Inventory, all transferable sources can target Drop Item, Drop Item is not draggable, and valid ability rebinding remains positional; verify drag resolver tests cover every source/destination combination.
- [x] 3.2 Render the permanent Drop Item row, capacity-modifier display, ability Inventory entries, and red landing state; verify component/page tests assert the row order, label, non-draggability, and red feedback class.
- [x] 3.3 Add focused muted Edge browser coverage for Drop Item feedback, ability-to-Inventory transfer, equipment/quick-slot drops, cancellation, and rejected drops; verify the live game has no console errors.

## 4. World presentation and assets

- [x] 4.1 Generalize the item-throw presentation and Babylon Lite renderer for item-specific flight and settled sprites, shared world depth, minimap parity, and dropped-object visibility; verify renderer tests cover flight expiration and matching game/minimap coordinates.
- [x] 4.2 Create the approved droppable-item representation table and author/register required new sprites; verify reused Health Potion, Mana Potion, and coin atlas entries plus dedicated runtime-atlas provenance and frame metadata.
- [x] 4.3 Add focused browser coverage for thrown/settled world rendering and recollection using `?mute=1`; verify the dropped object remains collectible after the flight completes.

## 5. Integration verification

- [ ] 5.1 Run `npm run typecheck` and `npm test`; verify all focused domain, renderer, and migration tests pass.
- [ ] 5.2 Run the applicable final muted browser suite after stopping any project-owned server; verify required WebGPU/browser capabilities or report unavailable capabilities explicitly.
- [ ] 5.3 Run OpenSpec validation/status and review the representation table against the implementation; verify all planning artifacts and task counts are complete.
