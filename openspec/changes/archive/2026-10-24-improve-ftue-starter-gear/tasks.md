# Tasks

## 1. Opening-run data and deterministic world content

- [x] 1.1 Replace newly created and post-death run defaults with empty Inventory, Equipment, Quick Slots, abilities, zero counters, and base capacity five; normalize legacy capacity items without clearing existing saved progress; verify focused campaign-state tests.
- [x] 1.2 Add the production-only, seeded World One Level One starter-pack generation phase, protected start area, Wooden Stick `+1` balance, and Level One Wooden Vest catalog/unlock; verify focused world-generation tests cover exact counts, distance, reachability, repeatability, and test-fixture exclusion.
- [x] 1.3 Add the original wooden chest-only vest frame and item-frame mapping while preserving atlas geometry and provenance; verify the focused renderer/item mapping test and asset dimensions.

## 2. Inventory effects and transfer comparison

- [x] 2.1 Implement `Extra Carrying Capacity +5` as a non-stackable one-entry item with six stored capacity and a shared carrying-capacity effect/icon projection; update item guidance; verify focused inventory and save-normalization tests for the 11 total/10 usable result.
- [x] 2.2 Generalize valid drag preview into an item-transfer comparison for Equipment, Quick Slots, Abilities, and discard, including explicit empty before/after states and discard net loss; verify focused drag and transfer tests.
- [x] 2.3 Repair Item Comparison inner-card label layout so `Before` remains visible for every populated or empty state; verify the relevant UI component test or DOM assertion.

## 3. Unarmed Battle behavior and guidance

- [x] 3.1 Add the authoritative attack-capable weapon guard so unarmed enemy bumps cannot damage, animate, spend resources, tick time, or run an enemy phase; expose matching forbidden cursor and black target-box state while preserving distant approach; verify focused combat and movement-mode tests.
- [x] 3.2 Emit Battle presentation settlement and render the repeatable unarmed in-world Tip panel only after settlement, with exactly `Tip`, `Battle Mode`, and `Assign a weapon, or you cannot fight.`; verify focused presentation/component tests.
- [x] 3.3 Run one focused Edge Playwright scenario with `?mute=1` covering nearby starter items, an unarmed Battle entry, settled Tip content, forbidden enemy feedback, and legible drag comparison; retain the result in the test output.

## 4. Integration verification

- [x] 4.1 Run the applicable Node test suite, typecheck/build, lint, and OpenSpec strict validation; resolve regressions and verify the new and legacy saved-campaign paths remain covered.
- [x] 4.2 Run the project's full applicable Playwright finalization coverage with `?mute=1`, or record the exact unavailable browser capability; verify the production UI remains usable at native scale. (Full Edge finalization is blocked in this desktop sandbox: Edge cannot write its temporary DualEngine profile files, producing error -5; the live `?mute=1` UI remains usable at native scale.)
