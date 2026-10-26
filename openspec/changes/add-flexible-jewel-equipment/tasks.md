# Tasks

## 1. Jewel content and domain model

- [ ] 1.1 Add the pure Jewel catalog with all ten agreed names, fixed modifiers, family/tier metadata, unlocks, and weights; register it with existing item factories/world names and add catalog tests proving exact data, distinct instance IDs, span one, and non-stackability. Register new Node test files in the repository's explicit `npm test` script and verify the focused catalog tests execute.
- [ ] 1.2 Extend EquipmentGroup, fresh campaigns, and equipment normalization with two Jewel positions; verify focused tests preserve Weapons/Armor and initialize missing Jewels without dropping any equipped Jewel during repeated normalization.
- [ ] 1.3 Add the complete player-facing Jewel table to the inventory/equipment documentation, distinguishing resource points from progression ranks and loot tier from vendor price; verify its ten names and values match the catalog test data.

## 2. Equipment transactions and buffs

- [ ] 2.1 Extend existing equip/swap/unequip/reorder compatibility to Jewels; verify every definition fits either position, matching families and duplicate definitions are allowed as separate instances, wrong groups reject, and accepted/canceled/rejected actions retain existing tick rules.
- [ ] 2.2 Integrate Health/Defense/Mana modifiers through existing effective attributes and ratio normalization; verify stored Jewels grant no buffs, two high-tier instances yield the documented caps, Prismatic replacement removes both old modifiers, and injured/zero-maximum resources stay finite and bounded.
- [ ] 2.3 Complete Jewel Inventory-return and Drop Item routing with the existing atomic projection; verify source-entry capacity is credited on swaps, full-Inventory unequip and blocked-world-drop reject losslessly, and valid drop/recollect preserves identity without auto-equipping or stacking.
- [ ] 2.4 Document worn-only behavior, additive stacking, no pair bonuses, compatibility, resource fullness, and one-tick equipment actions; verify focused transaction tests cover these documented examples and existing Weapons/Armor two-position gear still works.

## 3. Production generation and balance

- [ ] 3.1 Add the shared seeded item selector to normal pickup and chest/crate reward assignment, with the 25% Jewel channel, existing non-Jewel conditional selection, and per-item 25/11/4 weights; verify deterministic boundary tests, level gates 2/4/6/7, no-Jewel Level 1, and at least 10,000 fixed-seed draws within the design's 2-percentage-point channel tolerance.
- [ ] 3.2 Preserve exact Jewel modifiers through both reward-quality generation and opening-time Luck transforms while retaining existing non-Jewel behavior; verify high-quality/high-Luck chest and crate tests release the original Jewel identity and exact catalog stats without bypassing unlocks.
- [ ] 3.3 Record production seed/level witnesses for all ten definitions with test flags disabled and retain them as regression inputs; verify actual pickup/container generation, deterministic replay, valid placement/reservations/routes, unchanged item-count budgets, and the original Level 1 starter pack. Any optional object showcase must remain test-only and cannot serve as production evidence.
- [ ] 3.4 Increment the balance version and append the Jewel component to the then-current development compatibility epoch, preserving concurrent version components and updating browser fixture epoch declarations; verify one namespace-limited reset, unrelated-origin preservation, same-epoch save retention, and no stale regenerated baseline acceptance.
- [ ] 3.5 Document the channel probability, per-item eligibility/weights, fixed reward values, production witnesses, and measured strongest two-Jewel loadouts; verify the documentation matches selector metadata and measured Health +30, Mana +30, and Defense +6 maxima without changing approved item values.

## 4. Finished art and lifecycle rendering

- [ ] 4.1 Use the image-generation skill to create all ten original transparent Jewel graphics following the design's family/tier art manifest; verify each is identifiable at native item display size and none is a temporary generic bag, text marker, blank, or reused unrelated item.
- [ ] 4.2 Assemble the extended droppable atlas as four columns by six rows using the existing cell geometry, putting Jewels at frames 12-21 and leaving 22-23 empty; verify dimensions, alpha/content bounds, frame order, and exact decoded-pixel preservation of the original twelve cells.
- [ ] 4.3 Add complete Jewel name/frame registration and shared atlas geometry, then use it in Babylon settled pickups, reward/player throws, and DOM pickup-transfer cropping; verify all consumers reference the six-row layout and preserve existing anchors, shadows, visibility, and nearest sampling.
- [ ] 4.4 Add focused sprite/transfer regression tests covering all ten new mappings plus all twelve legacy indices; verify no new definition falls back to another graphic, every crop stays within its cell, and throw/settled/transfer presentations select the same item frame.
- [ ] 4.5 Record original art provenance and assembly details and add an item-art contact sheet under project documentation; verify all ten labels map to their final frames and the old atlas cells remain unchanged in the documented comparison.

## 5. Persistence and recovery

- [ ] 5.1 Extend live save/load, missing-group normalization, compact floor/delta restoration, and preselected container reward serialization; verify a mixed loadout, carried Jewels, unopened reward Jewels, dropped Jewels, and two identical definitions round-trip IDs, fixed stats, location, resources, and graphic selection without duplication.
- [ ] 5.2 Include Jewels in Adventure baselines, Journey checkpoints, and Classic handling, plus any generic lockbox item path already present at apply time; verify existing mode-specific retention/reset rules and ownership behavior remain unchanged without depending on unfinished lockbox work.
- [ ] 5.3 Document Jewel persistence and the once-per-epoch development reset separately from supported-save normalization; verify save/recovery tests cover both a same-epoch record missing Jewels and a new Jewel record surviving repeated reloads.

## 6. Current sidebar and focused browser check

- [ ] 6.1 Render exactly two full-width Jewel rows directly below Armor through the existing equipment group list and row component; verify component/layout tests preserve panel order, empty markers, blue strips, drag handles, internal scroll boundaries, and the existing focused equipment view.
- [ ] 6.2 Include Health and every removed/added Jewel modifier in item comparison and attribute previews; verify ring-to-amulet and Prismatic replacement tests show both gains and losses, invalid destinations show no preview, and cancellation leaves resources and time unchanged.
- [ ] 6.3 Add UI regression coverage for Jewel rejection by Abilities/Quick Slots and for Inventory sorting/counts, while retaining existing consumable quantities and Mana-driven ability behavior; verify the focused UI tests pass and no pair bonus controls, hotkeys, or anatomy labels appear.
- [ ] 6.4 Update the existing How to Play/inventory equipment guidance with Jewels and their passive role, using the normal documentation/tutorial workflow without redesigning unrelated topics; verify the text matches the selected two-slot behavior and remove only obsolete statements about the equipment group count.
- [ ] 6.5 After groups 1-6 are integrated, run one focused Playwright CLI check in Microsoft Edge through a verified project-owned server and muted URL; verify valid/invalid Jewel drags, full-resource preview, ordinary pickup credit, worn-item drop throw, recollection, and unchanged Abilities/Quick Slots, and record the focused result without repeating broader suites here.

## 7. Integrated verification and finalization readiness

- [ ] 7.1 Run `npm test`, `npm run typecheck`, and `npm run build` from the repository root; verify all pass with the Jewel tests included and report any unrelated failures separately without reverting concurrent work.
- [ ] 7.2 Use one project-owned server to complete the required Edge Playwright CLI, desktop Edge through `cua_repl`, and in-app browser checks on URLs containing `?mute=1`; verify playable WebGPU output, canvas presence, no unsupported-browser banner or console errors, portrait Info mode, compact landscape, focused Equipment, fullscreen, native-size graphics, and save/reload. Record unavailable required contexts as unfinished verification.
- [ ] 7.3 Stop the project-owned verification server before running `npm run test:browser:full`; verify the configured suite's server is the only suite server and that the applicable full browser suite passes, preserving existing equipment, pickup, and recovery coverage.
- [ ] 7.4 Create change-local `verification.md` mapping every delta requirement to actual test results, production seed witnesses, selector/budget measurements, all ten final art frames, and browser evidence; verify no missing data/graphic registration, temporary art, absent item source, pair-bonus behavior, or unresolved acceptance failure remains before marking Apply complete.
