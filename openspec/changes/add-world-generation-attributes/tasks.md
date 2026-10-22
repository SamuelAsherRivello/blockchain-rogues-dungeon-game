# Tasks

Confirmed: initial rolls use 0-5 and 30 points; lifetime values cap at 99.
Three-point growth allows repeated selections. Preserve strong differences
between ranks 1 and 5 and meaningful early growth through rank 14.

## 1. Remove provisional world-creation code and establish the contract

- [x] 1.1 Verify the provisional Create World runtime path is absent, as found during review; remove surviving prototype pieces only if present, preserve unrelated work, and verify existing character creation still works.
- [x] 1.2 Add the shared world-attribute names, labels, tooltip copy, bounds, neutral defaults, 30-point validation, and generation-identity model; verify focused unit tests cover alphabetical order, 0-5 bounds, exact 30-point rolls, and invalid-value normalization.
- [ ] 1.3 Add immutable per-floor generation profiles and a versioned save envelope, including exact attributes, seed, effective difficulty, generator/tuning versions, and compact deltas; verify save/load and return travel after attribute growth preserve terrain, IDs, consumed pickups, enemy traits, and opened objects.
- [ ] 1.4 Back up and migrate supported compact saves through legacy generator dispatch, initializing future world growth without replaying historical awards; verify old fixtures reconstruct unchanged, unsupported versions preserve original bytes, and document the save/version and rollback contracts with this group.

## 2. Implement deterministic attribute-driven generation

- [ ] 2.1 Add purpose-specific seeded streams and stable candidate/entity ordering for the new generation version; thread current profiles into first visits and frozen profiles into regeneration, and verify pickup RNG changes do not alter topology or encounters when their candidate sets remain unchanged.
- [ ] 2.2 Implement Clarity, Comfort, Discovery, Fortune, Guidance, Mercy, Openness, Peace, Plenty, and Safety generation effects with bounded tuning and protected start/exit/reachability validation; verify focused generation tests assert each attribute changes its intended output.
- [ ] 2.3 Add bounded generated awareness and engagement traits driven by Peace, consumed by the existing enemy AI; verify repeated profiles reproduce traits and increasing Peace never increases population or aggression in the tuning rules, without inventing an existing patrol system.
- [ ] 2.4 Add deterministic reward and pickup tuning for Fortune and Plenty, including payout, quality, reward chance, pickup frequency, and common-supply quantity; verify repeated seeds produce identical results and the two attributes remain behaviorally distinct.
- [ ] 2.5 Protect entrance/exit paths, safe arrivals, and puzzle reservations; validate after blocking placements and implement bounded deterministic repair/fallback. Verify a fixed corpus of at least 100 seeds against low/high profiles and interacting attribute pairs for reachability, path length, blocked corners, placement capacity, and stable repairs.
- [ ] 2.6 Define and document the parameter table and bounded benefit curves with explicit Fortune/Plenty/Discovery ownership, shared supply limits, and independent baseline difficulty. Verify early/middle/late depth reports include encounter pressure, recovery spacing, supply density, reward distribution, and one-point benefit direction; review these reports before accepting tuning.

## 3. Build the Create World flow

- [ ] 3.1 Compose Create World from the Create Character dialog geometry, shared cards, attribute presentation, roll animation, and dice audio; verify the new-game flow opens Create World only after character confirmation and cancellation leaves the Saved Game empty.
- [ ] 3.2 Render the ten attributes with shared components, tooltips, and minimap; freeze identity on opening and generate only after a completed roll. Verify cosmetic values do not feed generation, stale previews cannot win, and Confirm activates the exact displayed profile.
- [ ] 3.3 Add the read-only Generation Identity panel beneath World Attributes showing World, Level, Run on the left and Slot, Seed on the right; verify it matches the values used by the URL run identity for a selected Saved Game.
- [ ] 3.4 Confirm the rolled world sheet into campaign creation and persist it with the initial run; verify a confirmed campaign restores the same world attributes and first-floor output after reload.
- [ ] 3.5 Document creation, rerolls, cancellation, and the five-field identity layout with its custom-replay limitation; verify component tests cover shared layout, long seeds, desktop landscape, mobile portrait, and compact dialog bounds. Run the focused live check after group 4.

## 4. Add automatic world progression

- [ ] 4.1 Add one persisted growth event per earned character level, freeze its earning-floor seed/profile and difficulty, and derive three capped 0-99 points with replacement from a separate tagged stream. Verify repeated choices, +9 growth through three awards, saturation, stable replay, and character/dungeon-level distinction.
- [ ] 4.2 Track partial character spending against earned-level awards and atomically commit each completed award's world growth exactly once; verify 1+1+1 spending, six points at once, reopen/reload, interrupted results, invalid drafts, and unchanged tactical time. Verify cancellation before confirmation spends neither character nor world points.
- [ ] 4.3 Show a following `Level Up — World` result in the shared Character progression layout, with green changed numbers, aggregate results, and Continue; verify no adjustment arrows, ordered multiple results, and acknowledgment cannot reapply growth. Document this sequence with the progression tests.
- [ ] 4.4 Apply committed growth only to first-time floor generation, preserve profiles and reward descriptors of active/visited floors, and retain committed growth and pending events through death while resetting run-specific floor profiles. Verify descent, backtracking, delayed container opening, death, and reload.
- [ ] 4.5 Run one focused muted browser verification after the UI and progression group, following the project-owned server and three-context procedure: Playwright CLI Edge, desktop Edge, and in-app browser. Verify creation/identity layout, roll/preview/confirm parity, cancellation, tooltips, green growth results, and reload stability; record unsupported contexts explicitly. Reserve the full suite for finalization.

## 5. Integration verification

- [ ] 5.1 Cross-check the delivered UI, documented tuning, immutable floor profiles, growth events, and migration behavior against all capability scenarios; verify the lifetime cap decision has been applied consistently and no application blocker remains.
- [ ] 5.2 Run `npm run typecheck` and the focused procedural, persistence, progression, UI, and tooltip tests; resolve regressions caused by this change and report unrelated existing failures separately.
- [ ] 5.3 Run the applicable full browser suite with `?mute=1` during finalization and report unavailable browser capabilities and unrelated pre-existing failures separately.
