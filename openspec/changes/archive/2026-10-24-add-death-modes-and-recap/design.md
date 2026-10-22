# Design

## Context

See [proposal.md](proposal.md) for motivation and the delta specs for behavior. `Campaign` version 5 presently stores a deterministic world identity, compact level deltas, persistent progression, run possessions, and a Log, but no mode, checkpoint, level-entry state, or discovered-map state. `world-procedural-system.ts` immediately replaces a zero-Health campaign with a fresh Level 1 run, and `game.tsx` then returns to the main menu. Its commit callback writes that resulting state before the subscriber can present a recap.

The current menu sequence is Saved Game → Create Character → Create World. Existing Dialog primitives already support menu-sized bound dialogs and game-view centered dialogs. Campfires currently perform a paid rest through a domain action, and the minimap already renders the same campaign geometry through the Babylon Lite world renderer without pointer input.

## Goals / Non-Goals

**Goals:**

- Keep death/recovery rules authoritative and deterministic while allowing the UI to retain an immutable fatal snapshot for presentation.
- Keep long-term progression, run state, level-entry state, checkpoints, and discovered cells explicitly separate in persisted campaign data.
- Reuse the shared Dialog and world/minimap presentation boundaries without sending rendering concerns into the domain layer.
- Preserve valid pre-mode campaigns and avoid creating a resumable Classic state after death.

**Non-Goals:**

- Let players change a campaign's chosen mode after confirmation.
- Add manual save-scumming, multiple Journey checkpoint slots, a new renderer, accounts, or online saves.
- Change the existing Settings dialog or introduce Berlin Interpretation rules as game mechanics.
- Add unrelated combat balancing or a full post-run history/archive.

## Decisions

### Keep fatal state separate from persisted recovery state

Replace the immediate reset inside the procedural death path with a structured death outcome that leaves the fatal state available to the session result. The session commit boundary will recognize this outcome before its normal autosave write, capture an immutable recap model, and write only the applicable recovery state—or clear Classic's slot. React will freeze dispatch/input while the recap is open, then either start a new session from the prepared recovery state or return to the menu.

This prevents the current ordering problem, where the freshly reset state is saved before the UI can identify the killer or render the final encounter. Resetting in the React subscriber is rejected because a reload between commit and rendering could preserve the fatal state or reapply recovery inconsistently.

### Model recovery data as compact, mode-specific snapshots

Add a persisted campaign mode plus two optional compact snapshots: an Adventure level-entry baseline and a Journey checkpoint. The Adventure baseline records the clean deterministic entry state for the active level. Recovery regenerates/restores that baseline, then merges only the persistent character sheet from the fatal campaign and explicitly clears run possessions, resources, counters, time, and discoveries. Journey checkpoint records the complete committed campaign state after a stairs arrival or completed paid rest, including all player/run/world/discovery data.

Snapshots will use the existing compact campaign/level-delta boundary rather than duplicate full terrain grids. A shared pure recovery builder will validate snapshot shape, rebuild deterministic bases, and normalize the result before it can be displayed or saved. Reconstructing a level only from the fatal state is rejected because opened containers, removed enemies, and map knowledge would leak into Adventure's intended fresh-level retry.

### Store discovery as compact per-level knowledge

Represent discovered dungeon cells as a deterministic, JSON-safe per-level bitset (or equivalently versioned compact encoding) keyed by the active run and level. Domain movement/discovery returns changed knowledge with the committed state; renderer projections consume it to mask unvisited terrain, objects, and actors in both world and minimap views. The same value provides discovered-cell percentage and travels unchanged inside Journey checkpoints.

A transient renderer-only fog mask is rejected because reload, Journey recovery, and recap would disagree about what the player had discovered. Storing individual object visibility is rejected because discovery belongs to map cells and would not cover terrain consistently.

### Record Journey checkpoints only at meaningful committed boundaries

Create a Journey checkpoint after the committed stairs-arrival state and after the committed result of a paid campfire rest. It replaces the previous checkpoint atomically with the corresponding autosave. Classic and Adventure never create checkpoint data, and opening or cancelling a campfire prompt does not create one.

Recording checkpoints on proximity or initial campfire bump is rejected because it would make a no-cost safety save and contradict the established rest interaction. Adding a separate checkpoint button is rejected to keep all mode differences inside recovery behavior.

### Make combat facts actor-aware and recap selection projection-only

Extend the existing structured combat/resource/death events with source and target display identities where absent, especially for an enemy attack that kills the player. A pure recap selector receives the ordered event sequence and returns at most seven player-damage, enemy-damage, enemy-defeat, fatal-enemy, and player-death lines. Log formatting and recap formatting share facts but remain separate policies.

Formatted messages emitted by the combat system are rejected because they couple domain logic to two presentations. Rebuilding the recap from the general 200-entry Log is rejected because it has intentionally filtered combat events and contains unrelated actions.

### Reuse dialog placements but build dedicated mode and recap components

Add a menu-bound Select Mode dialog between the empty Saved Game action and Create Character. It holds local unconfirmed selection state, three semantic cards, the traits list, and Confirm. Add a game-centered Death Recap dialog that receives only its immutable recap model and recovery actions. It inherits the in-game Settings dialog's geometry, palette, and footer-button treatment while retaining no Settings controls or dismissibility. Its minimap is a passive snapshot projection; it does not read live input or mutate active camera state.

The Select Mode screen remains a stacked lightest-to-hardest card comparison followed by an explicit Confirm gate. The Death Recap follows a compact title → factual summary → paired Minimap/Log cards → footer-action hierarchy inspired by the reference's decisiveness without copying its sci-fi visual language. It has one visibly selected default recovery action. Mouse clicks activate an action directly; arrow keys move the selection and Enter activates it. A second confirmation step is rejected because death should invite a fast, informed retry rather than add friction after the player has read the recap.

Putting either surface inside the Settings feature is rejected because mode choice belongs to campaign creation and a death recap must not inherit Settings actions or dismissibility. Reusing the Settings dialog's presentation contract is required for the recap; reusing an in-world campfire popup is rejected because the recap requires game-view centering, a stable fatal map, and keyboard/input blocking.

### Version and migrate saved campaigns conservatively

Advance the campaign schema for mode, discovery, and recovery fields. The loader will recognize version-5 campaigns, make a recoverable raw backup before replacement, assign Adventure, initialize no Journey checkpoint, and derive a valid clean active-level baseline from its deterministic identity and generation profile. It preserves the live campaign state; the new baseline only governs a future Adventure death. Malformed or unreconstructable records remain unavailable instead of being silently placed in a different mode.

Migrating existing saves to Classic is rejected because it would turn a non-permadeath campaign into a destructive policy without player consent. Forcing existing players through a new mode choice is rejected because it blocks immediate resumption and makes migration depend on UI interaction.

## Risks / Trade-offs

- [Death can occur in several action paths, including traps and delayed abilities] → centralize fatal-outcome creation and cover every zero-Health path with pure tests.
- [Snapshot and discovery data can increase localStorage use] → use compact delta and bitset formats, retain one Journey checkpoint only, and surface the existing save error if storage rejects a write.
- [A stale Journey checkpoint could restore incompatible data after migration] → validate schema/version and discard only the invalid checkpoint while retaining the live campaign.
- [Fog can obscure interaction/readability unexpectedly] → keep player start revealed, use identical knowledge in both map views, and add focused renderer tests for visible and hidden cells.
- [The fatal recap could be bypassed by queued input or a delayed animation] → increment the session generation, clear movement/timers, and gate all input before presenting the dialog.

## Migration Plan

1. Add schema normalization for the mode, discovery, level-entry baseline, and Journey checkpoint fields while retaining version-5 compatibility.
2. On first valid legacy load, back up the raw payload, set Adventure, preserve the live state, and construct a normalized Adventure baseline. Do not synthesize Journey checkpoint data.
3. Write mode-aware saves and recovery snapshots only after validation; test migration, empty-slot creation, each death branch, and reload after recovery preparation.
4. If rollout is rolled back, retain the raw backup and keep the reader tolerant of the newer optional fields so supported active campaigns are not deleted.
