# Tasks

## 1. Remove provisional world-creation code and establish the contract

- [ ] 1.1 Surgically remove the provisional Create World component, state, callbacks, styles, types, and generator hooks while preserving unrelated working-tree changes; verify the diff contains no provisional Create World runtime path and the existing character-creation tests still pass.
- [ ] 1.2 Add the shared world-attribute names, labels, tooltip copy, bounds, neutral defaults, 30-point validation, and generation-identity model; verify focused unit tests cover alphabetical order, 0-5 bounds, exact 30-point rolls, and invalid-value normalization.
- [ ] 1.3 Add campaign persistence and legacy normalization for world attributes without changing existing save identity or unrelated progression fields; verify round-trip and missing-field migration tests restore neutral attributes and preserve slot, run, seed, and level.

## 2. Implement deterministic attribute-driven generation

- [ ] 2.1 Thread committed world attributes through campaign creation, floor generation, descent, death reset, and regenerated floors; verify seeded generation without explicit attributes remains compatible with existing fixtures.
- [ ] 2.2 Implement Clarity, Comfort, Discovery, Fortune, Guidance, Mercy, Openness, Peace, Plenty, and Safety generation effects with bounded tuning and protected start/exit/reachability validation; verify focused generation tests assert each attribute changes its intended output.
- [ ] 2.3 Add deterministic enemy behavior traits driven by Peace while preserving the enemy AI state-machine contract; verify the same floor identity and attributes reproduce enemy population, aggression, awareness, and pursuit traits.
- [ ] 2.4 Add deterministic reward and pickup tuning for Fortune and Plenty, including payout, quality, reward chance, pickup frequency, and common-supply quantity; verify repeated seeds produce identical results and the two attributes remain behaviorally distinct.
- [ ] 2.5 Add generation tests for difficulty bands and invalid placement repair or rejection; verify generated floors remain valid and later level scaling remains threatening despite positive world attributes.

## 3. Build the Create World flow

- [ ] 3.1 Compose Create World from the Create Character dialog geometry, shared cards, attribute presentation, roll animation, and dice audio; verify the new-game flow opens Create World only after character confirmation and cancellation leaves the Saved Game empty.
- [ ] 3.2 Render the ten world attributes alphabetically with tooltips, Roll, Confirm, and a Babylon Lite minimap preview; verify each roll updates both the displayed sheet and preview while preserving the 30-point contract.
- [ ] 3.3 Add the read-only Generation Identity panel beneath World Attributes showing World, Level, Run on the left and Slot, Seed on the right; verify it matches the values used by the URL run identity for a selected Saved Game.
- [ ] 3.4 Confirm the rolled world sheet into campaign creation and persist it with the initial run; verify a confirmed campaign restores the same world attributes and first-floor output after reload.
- [ ] 3.5 Run one focused muted Playwright check with `?mute=1` covering Create Character to Create World transition, roll-preview refresh, identity visibility, tooltips, confirm, and cancellation behavior; record the result and leave the broader browser suite for finalization.

## 4. Add automatic world progression

- [ ] 4.1 Add a pure deterministic selector for three distinct eligible world attributes using campaign identity, character level, generator version, difficulty, and recent world growth; verify repeated calls are stable, capped attributes are excluded, and selection does not depend on XP event order.
- [ ] 4.2 Apply automatic world growth after confirmed character allocation without changing the existing three character points, deferred allocation, or no-time-advance behavior; verify canceling or closing the progression draft leaves both character and world state unchanged.
- [ ] 4.3 Extend the existing Progression presentation to show world before/after values with green highlights and no player controls; verify the player can distinguish automatic world changes from manually allocated character changes.
- [ ] 4.4 Apply committed world growth only to the next generated floor and later floors, not the active floor; verify progression, descent, death reset, save, and reload tests preserve the intended timing.
- [ ] 4.5 Run one focused muted Playwright check for level-up progression, green automatic world changes, and unchanged active-floor presentation; record the result and leave broader browser coverage for finalization.

## 5. Integration verification and documentation

- [ ] 5.1 Document the ten world attributes, tooltips, generation identity fields, deterministic seed inputs, and automatic progression rules in the existing world-generation documentation; verify the documentation matches the implemented labels and formulas.
- [ ] 5.2 Run `npm run typecheck` and the focused procedural, persistence, progression, UI, and tooltip tests; resolve regressions caused by this change and report unrelated existing failures separately.
- [ ] 5.3 Run the applicable full browser suite with `?mute=1` during finalization and report unavailable browser capabilities and unrelated pre-existing failures separately.
