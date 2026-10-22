# Design

## Context

See [proposal.md](proposal.md) for the user-facing motivation and scope. The
current application already has Create Character and Progression React
windows, a shared attribute-panel presentation, Babylon Lite minimap rendering,
campaign persistence, URL run identity, and seeded floor generation through
`worldFloorSeed(worldSeed, slot, run, level)`. The reviewed source no longer
contains the provisional Create World implementation.

Saves reconstruct floors from generated bases plus entity/object deltas rather
than full terrain snapshots. `generatedFloorForCampaign` currently reads live
campaign difficulty, and `compactCampaignForSave` uses that base to compute
deltas. Adding live world attributes to that path without per-floor profiles
would silently change old terrain after a reload. Character progression also
supports partial allocations and accumulated points from multiple levels.

## Goals / Non-Goals

**Goals:**

- Reuse the established creation and progression UI patterns instead of
  inventing a parallel interaction model.
- Keep world attributes as persisted campaign state and keep run identity
  visible and read-only during creation.
- Make every world effect deterministic for a stable campaign identity.
- Keep active and previously visited floors stable when a player levels up;
  apply world growth to floors first generated after the update.
- Preserve existing saves and unrelated working-tree changes.

**Non-Goals:**

- Adding URL query parameters for the ten world attributes.
- Letting the player manually choose automatic world growth at level-up.
- Regenerating an active floor after world growth.
- Replacing the existing character progression allocation or tooltip system.
- Adding a new renderer, runtime dependency, or changing the required desktop
  landscape and mobile portrait layouts.

## Decisions

### Use one world-generation attribute contract

Define one ordered world-attribute contract with the ten names, initial 0-5
bounds, 30-point creation budget, label tooltips, and generation effects. The
procedural rules layer owns the contract and pure calculations; React windows
consume it for display. This avoids drifting labels, help text, and generation
behavior between Create World and later progression. The lifetime cap is a
blocking decision described at the end of this document; do not infer it from
the initial-roll range.

Alternative considered: define labels in the Create World component and rules
separately in the generator. Rejected because the player-facing explanation
could become inaccurate as generation tuning changes.

### Keep URL identity separate from world attributes

The identity panel renders the same five values used by the URL run identity:
World, Level, Run, Slot, and Seed. World and level identify the current realm
and floor; slot and run identify the campaign run; seed identifies the
persistent world seed. The existing derived floor seed uses world seed, slot,
run, and dungeon level; the World display value currently does not enter that
hash. Do not describe it as an existing seed input or silently change legacy
seed derivation. World 1 remains the supported creation context here.

Save a complete generation profile including identity, attributes, effective
difficulty, generator version, and tuning version. The five-value URL is an
identity locator, not a complete export of a custom world. Keep those five
visible values and explain the need for the saved profile in panel help. A
standalone URL uses a documented neutral profile unless saved custom parameters
are supplied through a separately authorized replay mechanism.

Alternative considered: serialize all ten attributes into the URL. Rejected
because it makes ordinary player URLs noisy and duplicates campaign state.

### Preview the same seeded generation path

Freeze creation identity when the dialog opens. Create World builds a preview
from that identity, the draft attributes, and a fixed initial difficulty, then
renders it through the existing Babylon Lite minimap path. Roll changes the
attribute sheet and preview together while keeping identity fixed. Cosmetic
animation uses separate randomness. Generate once per completed roll rather
than on each cosmetic frame. Confirmation activates the exact preview profile;
discard a stale preview if a newer roll has completed.

Alternative considered: draw a simplified UI-only preview. Rejected because it
could diverge from the active floor and would not validate generation effects.

### Apply effects through independent deterministic generation knobs

The generator consumes a normalized world-attribute object. Each attribute
modifies a bounded generation concern:

- Clarity adjusts room graph complexity and dead-end/branch frequency.
- Comfort adjusts campfire and recovery placement.
- Discovery adjusts optional reward, alternate-route, and secret placement.
- Fortune adjusts reward chance, quality, and payout rolls.
- Guidance constrains exit candidates toward the start.
- Mercy adjusts enemy health, damage, and elite selection.
- Openness adjusts corridor width and route accessibility.
- Peace adjusts enemy population and generated aggression/awareness traits.
- Plenty adjusts pickup spawn frequency and common-supply quantities.
- Safety adjusts trap and hazard frequency.

Use purpose-specific seeded streams for topology, encounters, enemy traits,
rewards, pickups, hazards, and growth. Derive each from the floor seed and a
stable purpose tag. Use stable entity/candidate IDs and deterministic tie
ordering. Adding a pickup roll must not consume randomness needed for enemy
placement or geometry. Geometry changes can still legitimately affect valid
placement candidates; stream isolation does not promise identical placements
when the walkable map changes.

Construct the entrance-to-exit route first, choose exit distance using actual
walkable path length, and reserve required puzzle doors, triggers, barrels,
stairs, and safe arrival cells. Apply optional branches and bounded corridor
widening within those constraints. Discovery adds optional access, while
Clarity controls navigation complexity; Discovery must not lengthen the
required route merely to add a reward. Validate reachability after blocking
objects and hazards are placed, including the game's blocked-corner rules.

Scan candidates in a stable order. Repair failed placements locally with a
fixed retry limit, then use a validated deterministic fallback. Never retry
indefinitely or activate an invalid floor. Record which repair/fallback ran in
generation diagnostics. Compare actual path length, dead ends, corridor widths,
reachable objects, and route blockage across a fixed seed corpus.

Keep legacy generation as an explicitly selected compatibility profile. A
numeric sheet of all 3s alone cannot preserve old RNG consumption or layouts
after introducing new streams. New campaigns use the new generator profile;
legacy reconstruction uses the original generator and tuning version.

Alternative considered: have one aggregate difficulty scalar replace the ten
attributes. Rejected because it hides the player's meaningful world choices
and prevents targeted generation tuning.

### Derive automatic world growth from a forked level-up seed

Distinguish character level from dungeon level. At each earned character level,
record a pending growth event with that character level, the earning floor's
seed and profile, campaign identity, and a growth-rule version. Freeze its
difficulty and relevant prior-growth inputs then, so deferring allocation or
dying cannot change the outcome. Resolve queued events in earned-level order
using an independent purpose-tagged seed and the preceding event's result.
Each event has a stable ID and a persisted applied marker.

The selector distributes a three-point award across distinct eligible
attributes. Cap eligibility and exhausted-budget behavior remain blocked on
the lifetime-range decision. Do not implement the old instruction to spend
fewer points as if that already resolved the conflict.

The selector uses level and difficulty weights to avoid a repetitive or
max-benefit-only progression. Recent growth history prevents the same small
set of attributes from being selected every level. The result is computed from
the frozen event inputs and committed history. The same complete event inputs
reproduce the same choices. Runs with different starting sheets or earning
floor contexts are not promised identical world upgrades from Seed alone.

Alternative considered: consume the live gameplay RNG when the level-up event
fires. Rejected because save timing and XP-award ordering would change future
worlds and break deterministic replay.

### Sequence progression without changing character allocation semantics

Keep the existing local character draft and partial allocation semantics. Track
spent points against queued earned-level awards in order. A world event becomes
eligible after all three character points for its award have been spent,
possibly across several confirmations. One confirmation spending six points
can complete two awards; one spending a single point must not grant three world
points repeatedly. Store counters and applied event IDs with progression.

Commit completed character awards and their world events in one validated
state transition, persist without advancing time, then show a separate
`Level Up — World` result using the Character window's shared attribute and
earned-results components. Show exactly the changed values in green, no
adjustment arrows, and a Continue control. Queue multiple results in order.
Acknowledgment changes presentation only and cannot apply an award again.
Reload restores committed growth even if its result screen was interrupted.

Alternative considered: give the world panel interactive arrows. Rejected
because the requested world progression is authored by the game, not chosen by
the player.

### Freeze each floor's generation profile

On first generation, store a compact immutable profile for that run and floor:
base seed, committed world-attribute revision, exact attribute values, effective
difficulty, generator version, tuning version, and generator family. Saving,
delta comparison, reload, and return travel always regenerate from that profile.
Global campaign growth affects only floors without a first-visit profile.

Freeze generated enemy traits and reward descriptors within that floor's base.
Opening a container uses its stable reward roll rather than current campaign
attributes. Where Luck contributes at interaction time, keep its existing
character effect explicit and separate from the world reward roll. Otherwise
world upgrades would change the contents of a previously generated floor.

Keep campaign world progression and pending awards through death, matching
persistent character progression. Start a new run's floor-profile map, advance
Run, and generate its Level 1 using current committed world attributes.

Alternative considered: regenerate all floors with the latest attribute sheet.
Rejected because compact deltas cannot reconstruct the previous terrain or
match removed entity IDs against a different base.

### Keep benefits bounded and difficulty independent

Create a reviewed tuning table for each attribute: affected parameter, neutral
value, lower and upper effect limits, and direction of benefit. Choose limits
before implementation tests are written. Larger Mercy or Peace must not raise
other threat values to cancel their benefit. Baseline enemy scaling still uses
dungeon depth and the frozen difficulty profile, not the player's chosen build
or measured success. Growth selection weights cannot replace this baseline.

Fortune owns chance and value inside reward opportunities; Plenty owns common
pickup frequency and stack size; Discovery owns optional reward locations.
Apply a shared supply budget after combining these effects, with smooth
diminishing returns rather than multiplying every bonus independently. Keep
the optional reward budget separate from required-route supplies so Discovery
does not remove essential resources. Do not add repeatable XP sources.

Peace uses bounded awareness and a generated engagement threshold within the
existing AI state machine. Generate behavior once, with stable traits, rather
than introducing a new random decision each turn. Preserve legal attacks and
combat rules. Add pursuit memory only if the corresponding behavior and tests
are explicitly included; the current AI has no patrol system to tune.

### Verify provisional cleanup against the current source

The previous prototype is already absent in the reviewed files. Inspect the
current source before touching it. Remove only any surviving prototype pieces;
otherwise record the cleanup task as verified without manufacturing a removal
diff. Preserve unrelated changes in shared files.

## Risks / Trade-offs

1. [Risk] Generation drift corrupts compact saves. -> Pin every visited floor's
   original profile and versions, isolate seeded streams, preserve stable IDs,
   and test save/load and return travel after world growth. Accept the small
   storage cost of profiles rather than storing a full terrain grid per floor.
2. [Risk] Combined geometry and placement settings create inaccessible or
   trivial floors. -> Protect the mission route and puzzle reservations,
   validate after blocking objects, and use bounded deterministic repairs.
   Test low/high extremes and conflicting pairs across a fixed seed corpus.
   Some requested counts may yield to legal placement capacity; record that
   result instead of forcing objects into invalid cells.
3. [Risk] Positive progression destroys pacing or runs out of upgrades. -> Use
   bounded benefit curves, explicit reward ownership, one award per earned
   level, and an independent baseline threat curve. Measure route encounters,
   recovery spacing, supplies per reachable area, and payout distributions at
   early, middle, and late depths. The lifetime cap still requires a user
   decision; a 0-5 cap cannot support the promised ongoing three-point growth.

## Migration Plan

1. Resolve the lifetime-growth conflict, then verify provisional cleanup.
2. Introduce a versioned save envelope and generation profiles. Back up old
   records before migration. Regenerate old compact saves with the supported
   legacy generator, capture their original profile, and then apply their
   existing deltas. Give their future world progression a neutral starting
   sheet without awarding historical level-ups again.
3. Retain legacy generator dispatch for migrated floors. If a stored version
   cannot be reconstructed, preserve its bytes and report an unavailable save;
   never silently rebuild with current rules. Do not stamp the current generator
   version over an older floor profile during every save.
4. Add bounded generation effects, Create World, and transactional progression.
   Write documentation and focused tests with each implementation group.
5. Run one focused browser verification after the UI and progression group,
   using the project's muted three-context procedure. Cover desktop landscape,
   mobile portrait, and compact dialogs; do not launch browsers during planning.
6. Run repository integration checks and the applicable full browser suite at
   finalization, observing the project's server-ownership rules.

Rollback restores the backed-up save envelope with its matching generator.
Hiding a dialog alone does not make new attribute-aware deltas readable by old
code. Do not promise a save-compatible downgrade without that migration path.

## Blocking decision: lifetime world-attribute range

The proposal promises three distinct one-point upgrades per earned level, but
the current draft caps all ten values at 5 after a 30-point start. Total spare
capacity is only 20 points, and distinct-attribute eligibility can fail sooner.
The spec's three-increase rule and this document's former fewer-than-three
fallback cannot both describe ongoing three-point progression.

Recommendation pending approval: retain 0-5 for initial rolls, use a larger
lifetime range such as 0-99, and apply bounded benefit curves with diminishing
returns. Alternative: retain the lifetime 0-5 cap and explicitly stop world
growth when eligible capacity runs out. Do not apply this change until that
choice is reflected consistently in the proposal, specs, and tasks.
