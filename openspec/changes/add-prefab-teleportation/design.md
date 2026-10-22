# Design

## Context

See proposal.md for motivation. The repository already has a validated in-memory prefab footprint and generation-time stamping, an authored `rogues-dungeon/public/assets/art/game-view/maps/prefabs/player-home.tmx`, deterministic floor generation, entity-layer rendering, persisted campaigns, and an iris transition used by the existing stair flow. Stairs currently combine movement entry, level switching, realm naming, destination placement, and persistence of visited floors, so prefab entry needs a separate active-map context without changing dungeon-level progression.

## Goals / Non-Goals

**Goals:**

- Keep stamp prefabs and teleport prefabs as separate behaviors sharing validation and authored entrance metadata.
- Add a deterministic, legal teleport-arrow object to generated floors.
- Support a `leveltest=1` developer placement near the World 1, Level 1 start and a normal one-per-level pseudo-random placement.
- Enter `player-home.tmx` through the existing iris transition and render it as the complete active map.
- Preserve dungeon identity and avoid a time tick during entry.
- Persist enough active-map state to resume safely inside the prefab.

**Non-Goals:**

- Returning from the player home to the dungeon.
- Adding a second arrow or return arrow inside the player home.
- Replacing or renaming the existing stair-based dungeon-level transition.
- Adding a general-purpose prefab editor or new external runtime dependency.

## Decisions

### Keep stamping and teleporting as separate operations

The existing stamp path will remain a floor mutation used by world generation. Teleport-prefab entry will instead select an authored map context and leave the generated floor intact. This prevents prefab geometry from being confused with a generated floor's protected cells, object reservations, or route topology.

An alternative was to stamp the home into a hidden off-screen region and move the camera there. That would couple standalone prefab dimensions and rendering to the 100-by-100 dungeon floor, so it is rejected.

### Represent teleport arrows as entities

The arrow is a world object on top of an otherwise walkable floor cell. Its destination prefab ID and optional direction metadata travel with the entity, while its visual is rendered in the shared object-depth pass. This matches the existing stair and interaction model and keeps terrain semantics independent from navigation markers.

An alternative was a special terrain role. That would make a visual/navigation marker alter walkability and complicate authored floor data, so it is rejected.

### Use deterministic placement with a test-mode constraint

The level generator will reserve a legal arrow cell after required stairs, entrances, stamped footprints, and other protected placements are known. Normal placement uses a generation stream derived from the floor identity and selects one candidate from the legal cells. When `leveltest=1` is active for World 1, Level 1, candidates are filtered to positions within 50 grid cells of the starting point before selection. If no candidate satisfies the test radius, generation reports the placement failure rather than overlapping required content.

The existing URL/dev-setting normalization should map the user-facing `leveltest=1` value to the project's level-one test generation option without changing unrelated test fixtures.

### Load the authored player-home map into the active map context

The prefab system will expose a runtime definition for `player-home.tmx`, including its dimensions, walkable cells, render tile layers where available, and authored entrance at the bottom-center position. The campaign will retain the generated dungeon floor as the return-capable source context even though this first release does not implement a return action.

The active map context must be explicit rather than inferred from `realm`. The dungeon level and world identity remain those of the source floor; prefab context identifies the standalone map currently being rendered and the player's local position within it.

### Reuse the iris transition as a map-context boundary

Arrow entry will follow the same cover-then-reveal lifecycle as stair transitions. While the iris covers the view, movement and turn dispatch are blocked, the active map context is committed, and the player is placed at the prefab entrance. The transition does not call the stair action, emit a dungeon-level arrival, advance time, or run an enemy phase.

### Keep minimap behavior aligned with the active context

The game view and minimap will receive the same active map context. During prefab entry, both invalidate their previous dungeon geometry and render the prefab context, preventing stale level-one terrain from remaining in either view. The prefab's smaller footprint is allowed to use the existing camera-bound rules for maps smaller than the visible span.

## Risks / Trade-offs

- [A prefab asset may not contain enough metadata to reconstruct runtime entities] -> Validate required dimensions, tile size, entrance, and supported layers before making the prefab selectable; fail generation or entry with a clear diagnostic.
- [One-way entry can strand the player in the first release] -> Make the limitation explicit in the UI/test contract and keep the source dungeon context persisted so the return feature can be added without redesigning campaign state.
- [A random arrow may collide with a required route or stamped footprint] -> Select only from the post-generation legal-cell set and reserve the selected cell before later optional placement passes.
- [Existing save migrations may encounter campaigns without active-map fields] -> Normalize missing context to the current dungeon floor and keep legacy campaigns playable.
- [The iris transition and Babylon renderer can expose stale geometry during a context swap] -> Commit context while covered, invalidate render models and camera state, then open only after the new active map reports ready.

## Migration Plan

1. Add normalized active-map fields as optional campaign data, defaulting legacy campaigns to the generated dungeon floor.
2. Add the teleport-arrow entity and deterministic placement without changing existing stair placement.
3. Add the player-home runtime asset definition and one-way entry action.
4. Add focused Node tests for placement, action semantics, and save normalization.
5. Run one muted focused browser check for arrow entry, iris completion, active prefab rendering, and unchanged Dungeon Level; reserve the full browser suite for finalization.

Rollback is safe by treating missing or unsupported prefab context as dungeon-floor context and ignoring teleport-arrow entities in older saved versions; no existing floor geometry or stair data is rewritten.

