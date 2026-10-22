# Proposal

## Why

Rogue's Dungeon currently gives the player control over character growth but
does not expose the world-generation choices that shape a run. Players need a
clear Create World step, readable positive world attributes, and deterministic
visibility into the generation identity behind the previewed dungeon.

The game also needs world growth to continue after character level-ups without
making a player choose both character and world upgrades. That growth must be
seeded so the same complete generation profile always produces the same result.

## What Changes

- Verify that the provisional Create World implementation is absent before
  adding the finalized flow. The reviewed source no longer contains it. Remove
  only surviving provisional code if found and preserve unrelated work.
- Add a Create World window after Create Character when starting an empty Saved
  Game. Reuse the Create Character window's size, placement, organization, and
  existing UI components.
- Show ten world attributes in alphabetical order, initially using 0-5 values
  and a 30-point total:
  - Clarity: Simplifies layouts with fewer branches and dead ends.
  - Comfort: Adds campfires and recovery points.
  - Discovery: Adds optional rewards, hidden discoveries, and alternate routes.
  - Fortune: Improves reward chances, payout amounts, and reward quality.
  - Guidance: Places the exit closer to the entrance.
  - Mercy: Weakens enemies and reduces elite threats.
  - Openness: Improves route accessibility with wider corridors and fewer
    blocked approaches.
  - Peace: Reduces enemy numbers and makes enemies less aggressive.
  - Plenty: Increases pickup frequency and the quantity of common supplies.
  - Safety: Reduces traps and environmental hazards.
- Reuse the existing roll presentation and dice audio for world rolls, and
  refresh the minimap preview after every roll.
- Add a second read-only panel beneath World Attributes using the same panel
  component. Show the five generation identity values as `World`, `Level`, and
  `Run` on the left, with `Slot` and `Seed` on the right. A new game begins as
  World 1, Level 1, Run 1, with the selected Saved Game slot and the active
  persistent world seed.
- Keep generation identity separate from the ten editable world attributes.
  The URL identity remains `world`, `level`, `slot`, `run`, and `seed`.
  Reproducing a custom floor also requires its saved attribute profile,
  difficulty, and generator version. The five URL values alone do not encode
  a custom world. Explain that distinction through the identity panel's help.
- Drive floor generation from the committed world attributes. Their effects
  must include layout clarity, recovery placement, discoveries, reward rolls,
  exit placement, enemy strength and elite frequency, route accessibility,
  enemy population and aggression, pickup frequency and supply quantity, and
  hazard frequency.
- After each character level-up and the player's normal character allocation,
  automatically increase three distinct eligible world attributes by one point
  each. Present the world changes in the existing progression layout with the
  changed values highlighted green; the player cannot choose these values.
  Record one pending world update per earned character level. Partial point
  spending, repeated confirmations, and reloads must never duplicate an update.
  Lifetime caps and exhausted-budget behavior need the decision below.
- Choose automatic world growth from level, campaign difficulty, recent world
  growth, and the level's deterministic seed so the result is impactful and
  naturally paced rather than always selecting the strongest benefit.
- Derive automatic world-growth choices from recorded earned-level events and
  their frozen generation context. Reloading, save timing, and allocation
  batching must not change the result for equal complete event inputs.
- Apply updated world attributes only to floors first generated after the
  update. Preserve the generation profile of every already visited floor
  through reloads and return travel, including its difficulty and version.
- Use independent seeded generation streams, bounded attribute effects,
  protected mission routes, and deterministic validation and repair. Keep
  baseline difficulty independent so upgrading a positive world attribute
  never secretly increases another threat to cancel its benefit.

## Generation risks and acceptance criteria

1. Saved floors could change after upgrades. Pin the exact generation profile
   for each first visit and apply saved changes against that original base.
   Acceptance includes save/load after an upgrade and travel back to an older
   floor with matching terrain, object IDs, rewards, and enemy traits.
2. Attribute combinations could break routes or pacing. Generate a protected
   entrance-to-exit route before optional branches, keep puzzle reservations,
   and validate after blocking objects are placed. Test extreme combinations
   with a fixed seed corpus and bounded repairs before activating a floor.
3. Positive growth could remove challenge, multiply rewards, or stop too early.
   Separate baseline threat from bounded benefits, assign reward ownership,
   and test scarcity, encounter pressure, and resource supply together.
   Resolve the lifetime growth range before implementing progression.

## Decision required before application

The current 0-5 cap permits only 20 additional points after a 30-point start.
Six full three-point upgrades consume 18 points; the seventh cannot improve
three attributes, and earlier sheets can leave fewer than three eligible
attributes. This conflicts with ongoing three-attribute growth through
character level 99. Keep the existing cap wording provisional until the player
chooses a lifetime growth range and saturation behavior. This is a blocking
product decision, not an approved change to the cap.

## Capabilities

### New Capabilities

- `world-generation-attributes`: Defines player-facing world attributes,
  generation identity visibility, deterministic attribute-driven generation,
  and automatic world growth.

### Modified Capabilities

- `campaign-saves`: Persist world attributes, pending growth, and immutable
  per-floor generation profiles alongside compact state deltas and run identity.
- `character-progression`: Add automatic world-attribute growth after the
  player's character-level allocation while preserving the existing three
  character points and deferred progression behavior.
- `tooltip-presentation`: Extend the established attribute-label tooltip
  pattern to the ten world attributes and their generation effects.

## Impact

Affected areas include the empty Saved Game creation flow, shared dialog and
attribute-panel components, campaign and save types, URL/run identity display,
procedural floor generation, enemy and pickup placement, progression handling,
minimap preview rendering, and focused tests. No new runtime dependency is
required. Playwright provides useful evidence for the Create World flow,
roll-preview refresh, identity panel, and automatic progression presentation;
proposal creation does not run browser verification.
