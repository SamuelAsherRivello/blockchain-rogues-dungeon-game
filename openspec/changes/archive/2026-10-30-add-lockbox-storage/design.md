# Design

## Context

See `proposal.md` for the player-facing change. The repository has synchronous campaign generation, React-owned input and dialogs, localStorage persistence, and a standalone player-home prefab context. The relevant existing paths are:

- `player-home.tmx` contains object IDs 3 and 4, named `lockbox-left` and `lockbox-right`, with type `lockbox`, GID 153, 32-by-32 selection bounds, and `walkable=false`. The GID resolves through `tilesets/examples/objects-overlay.tsx` to existing crate2 art.
- `prefab-system.ts` repeats those objects as two decoration entries and two hard-coded blocked cells. `playerHomeFloor` copies that runtime definition; it does not derive these lockboxes from the TMX objects. Home mutable entities are currently keyed by dungeon level.
- `InventoryViewItemsView` in `game.tsx` reads only `campaign.player.inventory`, calculates player capacity, and always renders Drop Item. Its memoized wrapper and pointer drop selectors also assume one Inventory.
- `inventorySlotCount` already accounts for `slotSpan`, while `stackInventoryItems` groups compatible consumables for display. `normalizeStackableLocations` can automatically absorb an Inventory consumable into an existing Quick Slot, which must not silently redirect an explicit lockbox withdrawal.
- Settings uses `Dialog`, Settings sizing classes, and `measureGameSettingsCenter`, which measures `.world-view-region`. The existing backdrop covers the whole viewport and receives pointer events.
- `writeSlot` persists one compact campaign under `rogues-dungeon.slot.<slot>`. `readSlotSummary` reads the campaign directly. Classic death calls `deleteSlot`; Journey restores a copied campaign checkpoint. The commit callback normally saves after state mutation, so storage transfers need a persistence-before-publication path for failure atomicity.

This is a cross-module data and UI change, so a design artifact is required. Existing unrelated working-tree changes must be preserved during apply.

## Goals / Non-Goals

Goals are to derive lockbox existence from authored content, isolate persistent item ownership from rewindable run state, and reuse inventory presentation without coupling storage capacity to player attributes. Simulation rules and transaction validation remain independent of React and browser storage.

Non-goals are procedural lockbox distribution, new placements or art, a general map-editor replacement, direct Equipment/Ability/Quick Slot transfers to storage, partial-stack controls, online sync, cross-Saved-Game storage, and changes to ordinary chest rewards, home reward distribution, or the separate refresh-duplication issue.

## Decisions

### 1. Read authored lockboxes instead of maintaining a second placement list

Add a small isolated reader and normalizer for the constrained Tiled tile-object format used by this prefab. Import the authored TMX as a Vite raw asset so normal generation can remain synchronous and Node tests can supply the same source text. Accept the established object type/class, numeric object identity, tile GID, dimensions, and typed walkability property. Reject unsupported geometry, missing or duplicate identities, unaligned/out-of-bounds footprints, and malformed lockbox metadata instead of guessing a placement. This reader is limited to the required authored-object subset; it does not replace the prefab's unrelated terrain representation.

Keep prefab-plus-Tiled IDs such as `player-home:3` and `player-home:4` as unique placement identities for validation and collision. All normalized lockbox records additionally carry `storageId: shared-lockbox`, and every bump opens that same Saved Game inventory. Do not duplicate Tiled numeric IDs, which must remain unique in the map. Moving or removing a placement affects its visual/blocker/access point only; any remaining authored lockbox still exposes the shared contents.

Normalize these records into explicit lockbox instances for the active prefab. Derive their visuals, blocking footprint, and bump lookup from the same records. Remove the two corresponding decoration and furniture-cell literals. Add no random placement pass or additional level/item-test fixture. A procedural pass may instantiate authored records when loading a prefab; it may not choose lockbox coordinates itself.

During apply, follow `tiled-ai-create-object` and its prerequisite `tiled-ai-setup`. Inspect the actual object layer, existing art/tileset, tile-object anchor, classes, bounds, and collision through live MCP. Current map properties already express blocking, so change assets only if the verified reusable object contract needs it. Preserve both existing placements, 32-by-32 selection bounds, nearest-neighbor art, and existing bottom-aligned anchor conversion. Save any changed map and external tileset explicitly through MCP with fresh revisions. If a needed class/property operation is unsupported, report that limitation rather than editing an open document behind Tiled.

Alternative considered: add interaction checks at coordinates 1,8 and 8,8. That would retain a second source of placement and fail the remove/move requirement.

### 2. Own persistent storage at the Saved Game level

Introduce a versioned Saved Game envelope at the existing slot key containing a nullable compact active campaign, a lockbox map with the canonical key `shared-lockbox`, a monotonic storage-transfer revision, and the ownership information needed for recovery reconciliation. The campaign remains the simulation model; the envelope owns state whose lifetime extends beyond that campaign. Keep retained storage out of `playerHomeEntities[level]`, floor deltas, and recovery snapshots.

The user explicitly chose to reset existing lockbox contents during migration. Remove legacy authored-ID containers on normalization, without changing the active campaign, transfer revision, journal, or provenance. Preserve any existing `shared-lockbox` contents and selected positions, even in a record that also contains legacy containers. Subsequent reads and writes retain newly stored shared items. If an earlier shared-store writer already persisted canonical overflow with `legacyOverflow`, preserve that shared data as scrollable withdrawals, block deposits above ten, and remove the marker once withdrawals restore normal capacity. No compatibility-epoch reset is required.

Make the persistence adapter unwrap the active campaign for existing consumers and read summary metadata through that adapter. An envelope with `campaign=null` is an empty, selectable Saved Game for character creation, even when retained lockboxes exist. Classic termination writes that state while retaining storage. A new character in the same slot replaces only the active campaign. Explicit Clear Local Storage still removes retained game data.

Recognize existing direct campaign records as legacy envelope input, initialize missing lockboxes empty, and preserve the existing campaign migration/backup safeguards. Do not clear supported saves or bump the development compatibility epoch for an additive compatible migration. Reject malformed persistent ownership state without silently emptying populated containers. Keep complete deterministic-URL runs on an in-memory adapter that never reads or writes the corresponding Saved Game record.

Alternative considered: independent lockbox localStorage keys. Separate writes cannot atomically commit a withdrawal and its Inventory destination and complicate Classic cleanup. A single slot record provides one durable ownership boundary.

### 3. Commit transfers before publishing their result

Add a pure lockbox transfer operation that takes the current campaign, persistent containers, the open authored lockbox identity, and a source item/stack identity. It returns either an unchanged rejection or a complete next aggregate and transfer description. It validates source ownership and active-container identity, compatible stack merging, item quantity, `slotSpan`, ten-position lockbox occupancy, and resulting player capacity using the existing capacity helpers. Capacity items have no effect while stored; removing one cannot force a world drop.

Transfers move the entire displayed item or stack. Keep alphabetical ordering and existing category treatment. A withdrawal ends in Inventory even when a matching Quick Slot is occupied. Separate preservation/normalization of stored locations from automatic pickup routing so save normalization cannot redirect this explicit destination. Ordinary pickup and Quick Slot commands retain their established behavior.

For persistent sessions, serialize and write the complete next envelope with one localStorage replacement before publishing it to the session and React. If the write fails, retain the prior in-memory aggregate and show the existing save-error message. Do not send a transfer through the existing mutate-then-autosave callback first. Flush/cancel any pending pixel-movement autosave and make future autosaves serialize the current aggregate so an older callback cannot overwrite a committed storage transfer. Use the memory adapter to publish equivalent transactions without browser persistence in inspection sessions.

Opening, transferring, and closing do not call `tick` or the enemy phase. Record transfer events for ownership and UI feedback without charging loadout time. Reject transfers to closed containers and all world/loadout destinations during a storage session.

Alternative considered: dispatch two ordinary inventory actions. It would expose partial ownership, charge turns, and allow a failed second action or storage write to lose or duplicate items.

### 4. Reconcile persistent ownership when restoring a run snapshot

Treat lockbox transfers as non-rewindable ownership changes. Each recovery snapshot records the transfer revision it observed. A compact transfer journal retains item identity and quantity provenance for later transfers that a still-restorable snapshot has not observed. Keep this bookkeeping in the same envelope commit as both containers.

On a deposit, record the source identities and quantities that leave run ownership. Scope source identities to their originating run identity so a later run's newly generated item cannot alias an earlier deposited item with the same local ID. Compatible stack merges must preserve those source lots in bookkeeping even though the UI shows a combined stack. Carry that provenance through the existing stack normalization, Equipment, Quick Slots, and world-drop representations as needed to identify those same quantities in a checkpoint. Do not use item names or category matching as ownership identity.

After reconstructing an older checkpoint or baseline, apply journal entries newer than its recorded revision before publishing or saving the recovered campaign. Remove superseded pre-transfer copies from carried possessions, equipment aliases, Quick Slot quantities, and reconstructed world pickups/deltas. An item or quantity currently owned by a lockbox can never also reappear in the restored run. A withdrawal removes storage ownership immediately and is never reversed by recovery. A checkpoint made after withdrawal can retain that run possession under its normal mode rules, unless a later deposit supersedes that ownership.

Reconciliation is idempotent: restoring or saving the same snapshot twice cannot subtract twice or replay a transfer. Track the applied revision in the recovered state, re-evaluate capacity after removals, and validate lot totals. Prune journal entries only when no supported recoverable snapshot can still reference the older ownership. Classic retains the persistent envelope while clearing its active campaign; Adventure still clears run possessions; Journey keeps unrelated checkpoint state exactly. No new checkpoint is created merely by opening or using storage.

Alternative considered: copy current lockboxes over a restored checkpoint. That preserves the containers but duplicates a deposited item if the checkpoint still contains it, including as a world pickup. Replacing the entire checkpoint on every transfer would change the existing checkpoint triggers and is outside this design.

### 5. Parameterize inventory rows and preserve drag routing

Refactor the existing inventory presentation into a reusable, narrowly typed component with explicit `items`, `capacity`, container identity, and `showDropItem` props. Keep a player wrapper that supplies its existing defaults. The lockbox wrapper supplies its contents, capacity 10, and `showDropItem=false`. Default to an empty item array for an uninitialized lockbox. Memoization must include these props so a changed lockbox cannot show another container's cached rows.

Extend drag source/destination types and DOM data attributes with container identity. Limit hit testing to the active storage session and reuse the existing pointer threshold, pointer-following preview, category colors, departure state, landing state, and cancellation cleanup. Empty positions must remain discoverable drop targets. Capacity checks use the same transaction preview as final commit, so a full or invalid target has no valid landing feedback.

Storage transfers target a specific row selected by the user. Only that valid hovered row highlights. Persist the chosen container slot with each item so gaps, deposits and withdrawals retain their selected positions after closing or reloading. Unpositioned items use the existing alphabetical order to fill available positions. Compatible stacks still combine, with the resulting stack occupying the selected destination. Two-position items require room for their complete footprint, but highlight only the hovered anchor row.

This does not add a second independent inventory implementation. Keep existing player Inventory drop behavior when storage is closed. During storage, disable the player Drop Item destination and other gameplay destinations even if their ordinary rows remain visible. Lockbox rows never contain Drop Item. Inventory and lockbox remain the only mutable item locations during the modal session.

### 6. Separate world blocking from the storage interaction layer

Add `lockbox-window.tsx` using the shared dialog heading, close control, theme, and Settings sizing. Reuse the game-view center measurement and refresh it on resize, aspect change, and fullscreen change. Share geometry tokens/selectors where necessary instead of copying fixed pixel coordinates. If modifying `ui/Dialog.tsx`, rename it to `ui/dialog.tsx` and update every import under the repository naming policy.

Use a storage-specific backdrop scope that darkens the world view without intercepting the player's Inventory. Limit pointer handling to the window and inventory interaction regions, while explicit input and simulation gates block the world, loadout actions, hotkeys, mobile movement, gamepad actions, hazard processing, and queued travel. Opening storage clears held directions and mouse routes. Defer the opening until any already accepted interaction presentation has settled; pending callbacks cannot mutate gameplay behind the window. Pause/resume timing must not turn elapsed modal wall time into hazard or cooldown catch-up damage.

In portrait and collapsed-panel layouts, temporarily reveal the existing Inventory panel while storage is open and restore its previous panel selection on close. Keep both containers reachable within the fitted viewport and preserve internal Inventory scrolling. X closes the window; Escape first cancels an active drag and otherwise closes the window. Closing during any uncommitted gesture cancels it. The modal itself and drag state are transient and are not restored after reload.

Alternative considered: reuse Settings's full-viewport pointer-blocking backdrop unchanged. It would stop the required drags from the visible player Inventory.

## Risks / Trade-offs

- [Checkpoint and stack provenance can duplicate items if reconciliation only compares item names or current lockbox contents.] Mitigation: stable identity/quantity lots, revisioned ownership changes, and recovery tests spanning deposit, withdrawal, merge, drop, and repeated restoration.
- [Changing the slot record shape can affect summary caching, migration, Classic death, and deferred autosaves.] Mitigation: one adapter boundary, legacy-record fixtures, nullable-campaign summaries, one atomic replacement per transfer, and tests against stale save callbacks and rejected writes.
- [Pausing only keyboard input would allow mouse travel, timers, gamepad input, or hazards to continue.] Mitigation: a session-level simulation gate plus all input entry points, explicit pending-action handling, and no catch-up after closing.
- [Settings geometry and the whole-viewport backdrop can hide or block Inventory on narrow layouts.] Mitigation: shared responsive sizing, game-view centering, storage-specific pointer regions, and browser checks in portrait, compact landscape, and fullscreen.
- [The Tiled editor was disconnected during exploration.] Mitigation: re-run the read-only setup check during apply and finish live authoring verification before reporting the object path complete. Planning does not launch or repair the editor.
- [A slot-format migration increases rollback work.] Mitigation: retain source-format backups and limit the user-approved reset to legacy placement-specific contents. A rollback must convert or restore records deliberately; do not run an older writer against a new envelope.

## Migration plan

1. Add legacy direct-campaign and new-envelope reader tests, then the minimal migration and versioned writer. Initialize missing lockbox state empty, reset legacy placement-specific contents as requested, and retain canonical shared storage and valid campaign/recovery data.
2. Add ownership and atomic transfer behavior before connecting the UI, including Classic tombstones, snapshot reconciliation, and unsaved inspection mode.
3. Derive lockboxes from the authored map and connect the shared inventory rows, pause gates, and window. Keep the same authored IDs and placements so existing contents remain addressable as maps move.
4. Verify focused logic tests, typecheck, full Node suite, and production build. Use one owned safe-port server for one focused Edge Playwright CLI check and the required desktop Edge/in-app browser verification, always with `?mute=1`. Stop that server before running any repository Playwright suite that starts its own server.
5. At finalization run the full applicable browser suite and record migration/recovery evidence. Before rollback, preserve new slot records and migrate them back or restore known backups; never silently discard retained items.
