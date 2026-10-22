# Design

## Context

See proposal.md for motivation. The current game separates serializable campaign rules from React drag presentation and Babylon Lite world rendering. Inventory and equipment already use typed drag sources and destinations; abilities currently use a separate positional drag path. World entities already support serialized `item` objects, while `item-throw-animation-system.ts` provides a reusable parabolic flight used by chest coins.

## Goals / Non-Goals

**Goals:**

- Make effective inventory capacity a derived rule that is safe for collection, transfer, save migration, and UI display.
- Route all transferable objects through explicit domain actions so source removal and world spawning are atomic.
- Reuse the existing throw animation and world-depth pass while supporting item-specific sprites and quantities.
- Keep Drop Item feedback visually destructive without changing ordinary destination colors.
- Provide a reviewable item-representation inventory and a dedicated runtime atlas for approved new sprites.

**Non-Goals:**

- Repacking the approved runtime atlas into the legacy 32-pixel `items-static` tileset.
- Adding new item categories, multiplayer item ownership, trading, item durability, or randomized drop scattering.
- Making gold counters or keys draggable; they remain counter pickups unless a later change explicitly adds them to Inventory.
- Replacing the existing equipment, quick-slot, or ability transaction model with browser-native HTML drag-and-drop.

## Decisions

### Keep one canonical transferable-object model

Extend serializable item/object identity so equipment, consumables, Extra Space, and abilities can be represented in Inventory and as world entities without duplicating gameplay definitions. Abilities remain bound by `AbilityId` when equipped in ability positions; their Inventory/world form carries that identity and does not execute while stored.

Alternative considered: create separate ad hoc `DroppedWeapon`, `DroppedAbility`, and `DroppedPotion` models. Rejected because collection, persistence, and event handling would diverge for each category.

### Derive effective capacity from carried modifiers

Retain the current base capacity of 10 as the planning default. Compute effective capacity from the base plus active capacity-item modifiers, with Extra Space consuming one slot and granting +5. Use the same derived value for visible counts, collection acceptance, equipment/quick-slot returns, and migration validation.

Alternative considered: mutate `inventoryCapacity` whenever Extra Space moves. Rejected because it makes save recovery and rejected transfers vulnerable to ordering bugs.

### Resolve Extra Space removal overflow atomically

Dropping Extra Space removes its five-slot modifier. If the remaining carried
items no longer fit the base capacity, the same committed action deterministically
selects additional inventory stacks until the inventory fits again and drops
those stacks as separate world objects. Ordinary drops keep the immediate
eight-cell rejection rule; this overflow path expands through cardinal neighbors
until it finds distinct walkable cells for every required world object.

Alternative considered: reject Extra Space removal whenever the remaining
contents exceed base capacity. Rejected because it leaves the player unable to
use the universal Drop Item action to recover from an overfilled inventory.

### Add a first-class world-drop action

Resolve a Drop Item release in the domain layer, choose a deterministic valid adjacent destination, remove the source only after validation, emit structured events, and add a serialized world entity. React owns only transient pointer feedback and dispatches the action.

Alternative considered: remove the source in React and spawn the world object after animation. Rejected because a failed spawn could lose an item and would make saves race with presentation.

### Generalize the existing throw presentation

Keep `throwItems` and its easing as the shared flight primitive, but pass item representation data rather than assuming gold. The renderer will draw flight sprites and settled item entities through the existing pickup/world-depth ordering, with minimap coordinates derived from the same entity state.

Alternative considered: add a second animation system for dropped items. Rejected because chest coins already establish the required arc and lifetime behavior.

### Author art through an approval inventory

Create a documentation/test-visible table mapping every droppable entry to an existing atlas frame or a new authored representation. Reuse Health Potion, Mana Potion, and coin art. Register the approved new sprites in a dedicated runtime atlas so the legacy 32-pixel `items-static` tileset remains stable; final packing into another Tiled tileset can be chosen later without changing item identity or spawn rules.

### Preserve event and save boundaries

Add drop and recollection facts to the structured event stream and persist dropped entities through the existing level-state delta/save migration path. Log formatting remains a subscriber concern, and rendering never mutates campaign state.

## Risks / Trade-offs

- [Existing saves may contain the old item/ability shape] -> Add normalization and migration tests before enabling new actions.
- [Extra Space could create an over-capacity state when removed] -> Deterministically drop enough additional inventory stacks in the same atomic action to restore base capacity, using expanding unique world cells.
- [A dropped item could land on an occupied or offscreen cell] -> Validate against terrain and entity occupancy, use deterministic fallback cells, and reject atomically when none exist.
- [Item art may not fit the selected tileset] -> Treat the representation table as an approval gate and validate atlas dimensions/frames before implementation completion.
- [World and UI transfer timing could disagree] -> Make domain state authoritative immediately on commit and use presentation-only flight state, matching current chest-coin behavior.
