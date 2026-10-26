# Design

## Context

See `proposal.md` for motivation and the five delta specs for acceptance behavior. This crosses content, rules, UI, generation, rendering, and persistence, so a design artifact is required.

The inspected implementation has `EquipmentGroup = "weapons" | "armor"` and two array positions per group. Item instances already carry IDs, modifiers, category, and stackability. `effectiveAttributesFor` aggregates unique equipped instances and supports additive Health, Defense, and Mana modifiers. `normalizeStackableLocations` currently reconstructs only Weapons and Armor, so adding a group only to the type or UI would lose Jewels during normalization. Campaign creation, recovery, and save normalization also need the new group.

`WORLD_DROPPABLE_ITEM_NAMES`, `itemCatalog`, and `worldDroppableItemInstance` control world-item construction. `world-balance.ts` declares unlocks and rarity weights, but normal item and container selection currently choose uniformly from eligible names. Container generation scales reward modifiers by world quality, and opening adds character Luck. Both would change the agreed Jewel values unless Jewels are explicitly excluded from those modifier transforms. Enemy defeat currently grants XP without an item-drop path.

The inspected droppable PNG has twelve frames in four columns and three rows. The Babylon atlas uses 362-pixel cells; DOM pickup transfers separately assume four columns and three rows. World pickups, throws, and transfers already resolve dedicated frames by item name. Extending the PNG without updating both consumers would render incorrect crops.

Some historical config/docs describe body slots, ten Inventory entries, or one aspect. Current source, current specs, the selected design, and project guidance establish two Weapons, two Armor, five base Inventory entries, and desktop landscape/mobile portrait. This change adds only the selected Jewels group and does not repair unrelated historical text. It must also accommodate the active lockbox and generation work without importing that work into this change.

## Goals / Non-Goals

**Goals:**

- Extend the existing ownership and equipment transaction path with a third two-position group.
- Keep the ten content definitions, generation metadata, and art registrations complete and auditable.
- Limit loot dilution and modifier growth while making all ten items attainable through production rules.
- Reuse current render, transfer, resource, and recovery behavior instead of parallel Jewel-specific systems.

**Non-Goals:**

- New item activation, pair bonuses, anatomical slots, stack quantities, vendors, crafting, enemy loot, worn hero overlays, renderer replacements or fallbacks, or broader inventory redesign.
- Implementing the pending lockbox or world-generation proposals. Existing generic containers must support Jewels when present; this change does not depend on unfinished storage features.

## Decisions

### 1. Add a normal equipment group and a small authoritative Jewel catalog

Extend the existing group union with `jewels`. Store exactly `[null, null]` initially. Add a pure `src/content/items/jewel-catalog.ts` containing the ten definitions and their family/tier/unlock/weight metadata. Use the established canonical names and existing per-instance `id`; do not introduce a second ownership identity or derive uniqueness from a name. Register its definitions with the existing catalog, world names, and instance factory. Every initial Jewel has `category: "equipment"`, `group: "jewels"`, span one, and `isStackable: false`, with no consumable or ability properties.

Keep catalog, balance eligibility, and sprite registration coverage checked as sets. A catalog entry is incomplete if any downstream registration is absent. Family metadata is descriptive and never restricts either slot.

Alternative: label ordinary Armor rows as Jewels. Rejected because it admits incompatible items and would not provide independent Jewel ownership. A general rewrite of all item definitions is unnecessary.

### 2. Reuse group-based transactions and resource normalization

Extend group enumeration in normalization, fresh campaigns, preview, save loading, and recovery snapshots. Preserve Weapons/Armor multi-position behavior and unique-instance deduplication. Inspect hard-coded two-group reconstruction rather than assuming every `Object.values(equipment)` consumer needs changes.

Reuse `projectEquipmentSwap`, preview projection, equip/unequip/reorder, and Drop Item routing. Replacing one carried Jewel in a full Inventory must consider the freed source entry; rejecting an incompatible or impossible transaction commits nothing. Returning equipped gear to Inventory requires capacity. Validate both row indices and group compatibility at the rules boundary, independently of pointer feedback.

Aggregate Jewel modifiers in the current effective-attribute calculation. Health and Mana bonuses are actual capacity points, not progression ranks multiplied by ten. Reuse ratio-preserving resource normalization on accepted equip, swap, unequip, and equipment drop. Preview includes Health and all removed modifiers, including Prismatic Amulet's two resources, without touching authoritative resources. Preserve the current Stamina-dependent Defense calculation.

Alternative: separate passive-buff records. Rejected because they duplicate equipped ownership and complicate removal, preview, and recovery.

### 3. Preserve the sidebar and category cues

Extend the existing `SlotListView` group list to Weapons, Armor, Jewels. Reuse the full-width `EquipmentItem`/`SlotItem` rows, blue category strip, empty `+`, drag handles, comparison presentation, and focused equipment card. Keep both Jewel positions untyped and unlabeled by anatomy. Add no pair indicator, new hotkey, silhouette, or new card. Continue alphabetical Inventory ordering and one-entry capacity per Jewel.

Keep the existing viewport fit, portrait Control/Info switching, fullscreen arrangement, and equipment/Inventory scrolling. Adding rows must not move primary UI into gutters or introduce whole-panel scrolling outside the permitted boundaries. Ability and Quick Slot compatibility and action logic stay unchanged; tests exercise Jewel rejection at both destinations.

### 4. Add a bounded Jewel channel with fixed item modifiers

Add a pure seeded selector shared by the ordinary pickup pass and existing chest/crate `rewardItem` assignment. Keep the existing budget and successful reward-roll count. Partition eligible names into Jewels and legacy non-Jewels; when Jewels are eligible, choose the Jewel partition with probability 0.25. Otherwise use the original selection path without an extra Jewel. For the other 0.75, preserve the existing non-Jewel selector and its conditional distribution.

Within the Jewel partition, choose each eligible item in proportion to its explicit weight. Low-tier items unlock at level 2 with weight 25 each; middle-tier at 4 with weight 11; Prismatic at 6 with weight 4; high-tier at 7 with weight 4. At level 7+, the total Jewel weight is 124. All three low-tier items together have weight 75, middle-tier 33, and high/special 16. The channel is a fraction of an item roll, not a guaranteed floor drop or a fraction of gold/potions. No new dedicated item-count budget is added.

Use the appropriate pickup/reward RNG streams and existing normal cell-claiming rules. Never add production near-start Jewel fixtures. Register names with any existing deterministic object showcase for coverage only; production seed witnesses must use test flags off. Do not modify the production starter pack.

Skip both world-quality multiplier and opening-time Luck modifier transforms for `group === "jewels"`. Other rewards keep their existing rules. A generated container Jewel's identity and exact catalog modifiers remain fixed through opening. No source or extreme world attribute may produce a Jewel above its unlock level or above its listed modifiers.

Balance checks cover selector boundaries and normalized weights, then a fixed-seed sample of at least 10,000 selector draws with a 2-percentage-point tolerance for the 25% channel. Record production seed/level witnesses for all ten definitions, verify their actual cells/reward containers, and retain those seeds as regression inputs. Compare floor counts to existing budgets rather than adding fixtures until items appear. The two-slot ceiling bounds maximum Jewel-only additions at Health +30, Mana +30, or Defense +6 when specializing. Do not change accepted item values silently during tuning; report a value change for review.

Alternative: append ten names to the uniform pool. Rejected because their count would dominate existing items. Globally changing rarity selection for all existing loot is a separate balance change.

### 5. Extend the existing atlas with ten finished graphics

Preserve frames 0-11 and their decoded pixels. Extend `droppable-item-sprite-sheet.png` to four columns and six rows at the existing 362-pixel cell geometry. Assign new frames as follows; frames 22-23 remain transparent and unused:

| Frame | Jewel | Art direction |
| --- | --- | --- |
| 12 | Copper Ring of Vigor | Simple warm copper ring with a small red inset |
| 13 | Silver Ring of Vigor | Silver band with a larger red cabochon |
| 14 | Gold Ring of Vigor | Ornate gold band and prominent ruby setting |
| 15 | Copper Guard Bracelet | Broad copper wrist band, visibly thicker than a ring |
| 16 | Silver Guard Bracelet | Reinforced silver cuff with an engraved guard motif |
| 17 | Gold Guard Bracelet | Gold cuff with layered plates and a central red stone |
| 18 | Quartz Amulet | Simple cord and pale quartz pendant |
| 19 | Sapphire Amulet | Chain and blue sapphire pendant |
| 20 | Star Sapphire Amulet | Elaborate star-shaped blue gemstone setting |
| 21 | Prismatic Amulet | Faceted pendant with several distinct gem colors |

Produce original transparent-background art matching the inspected droppable sheet's pixel-art treatment and readable at the current 32-world-pixel item display size. Follow the image-generation skill during apply, generate the ten new cells, and assemble the extended atlas while preserving the old twelve cells exactly. Do not use a generic bag or letter marker as final art. Verify non-empty alpha, content bounds, distinct silhouettes/details, and no neighboring-frame spill. Document source artwork and assembly in `asset-provenance.md`.

Expose shared atlas geometry alongside the existing sprite lookup in `world-object-sprite-system.ts`. Use that metadata in the Babylon atlas and DOM transfer image dimensions/cropping, replacing the duplicated three-row assumption. Extend canonical-name lookup for frames 12-21; leave every legacy frame number unchanged. Reuse the same path in settled pickups, chest/crate release, player throw, minimap where applicable, and world-to-UI transfer. Preserve the existing stationary ordinary-item anchor and grounded shadow; do not add a new animation policy.

Alternative: a second Jewel-only texture path. Rejected because it adds a new rendering branch across all three lifecycle presentations without needing different geometry or behavior.

### 6. Persist and normalize Jewels at every campaign boundary

Keep the existing campaign format unless required by the active save implementation. Initialize missing Jewels to two empty positions for supported records; never reconstruct equipment with only Weapons and Armor. Normalize and serialize live campaigns, floors and level deltas, preselected container rewards, Adventure baselines, and Journey checkpoints. Retain fixed stats and stable IDs through floor travel, save/reload, and mode-specific recovery. If lockbox envelopes have landed, use their generic item serialization and ownership handling without creating Jewel-specific storage exceptions.

Increment `WORLD_BALANCE_VERSION` and the current `DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH` because changed selection and RNG consumption change regenerated floor content. Append a Jewel-specific compatibility component to the then-current epoch rather than replacing components introduced by concurrent work. This invokes the already authorized development-only reset once, scoped to game keys. It does not redefine normal supported-save migration or let an older floor baseline be silently regenerated under new rules. Same-epoch missing-group normalization remains independently tested, including non-browser storage adapters.

Alternative: retain all old balance algorithms and dispatch by stored balance version. Valid for long-lived production compatibility, but unnecessary for this early-development change given the project's explicit epoch-reset policy.

## Risks / Trade-offs

- [Expanded pools could reduce useful legacy loot.] Mitigate with a fixed 25% category channel, unchanged item counts, and distribution/budget checks.
- [Container quality or Luck could inflate Jewels.] Exclude Jewels at both modifier-transform sites and test high-quality/high-Luck reward release.
- [New rows or long names could hide Inventory.] Reuse internal equipment scrolling and verify compact landscape, portrait, focused view, and fullscreen.
- [GPU and DOM atlas geometry could disagree.] Share the layout metadata and test all ten new frames plus the twelve old frame identities and pixel preservation.
- [A normalization or recovery path could erase Jewels or duplicate buffs.] Round-trip all ownership locations and all existing death modes, including two instances of the same definition.
- [Other active changes touch generation, rendering, and persistence.] Re-read those changed sections during apply, retain their behavior, and scope edits to Jewel integration.
- [Balance is initially designed rather than human-playtested.] Record production-seed drop rates and the strongest two-Jewel loadouts during verification; keep numerical changes reviewable.

## Migration plan

1. Add catalog/registration tests and extend group normalization before connecting generated Jewel items to the UI.
2. Add selectors and fixed-value handling, then complete the new art and all render consumers before enabling Jewel generation in the finished build.
3. Update the balance version and compatibility epoch together and update browser fixture epoch declarations. Test one reset and subsequent save retention.
4. Run logic, type, build, focused browser, and finalization checks below. Record actual art and production seed evidence.
5. Roll back source, atlas, lookup geometry, and balance metadata together if needed. Keep a monotonic compatibility marker when a rollback invalidates newer saved floors; do not reconstruct changed baselines with a mismatched selector.

## Verification approach

Planning performs no browser launch or game changes. During apply, run one focused Edge Playwright CLI check after the integrated implementation group for Jewel rows, valid/invalid swaps, stat preview, collection, drop throw, and recollection. All automated game URLs include `?mute=1`.

For finalization, run `npm test`, `npm run typecheck`, and `npm run build`; then verify the live game through Edge Playwright CLI, desktop Edge through `cua_repl`, and the in-app browser using one project-owned server. Confirm playable WebGPU rendering, no unsupported-browser banner, at least one canvas, and no console errors. Cover portrait Info mode, compact landscape, fullscreen, native-size item art, and save/reload. Stop that server before `npm run test:browser:full`, whose configured server owns its separate port. Record unavailable required contexts as incomplete verification, not a pass.
