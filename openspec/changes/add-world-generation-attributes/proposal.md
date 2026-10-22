# Proposal

## Why

Rogue's Dungeon currently gives the player control over character growth but
does not expose the world-generation choices that shape a run. Players need a
clear Create World step, readable positive world attributes, and deterministic
visibility into the generation identity behind the previewed dungeon.

The game also needs world growth to continue after character level-ups without
making a player choose both character and world upgrades. That growth must be
seeded so the same world, slot, run, and level always produce the same result.

## What Changes

- Remove the provisional Create World implementation currently present in the
  working tree, then implement the finalized version through this change. The
  cleanup must be surgical and preserve unrelated work in shared files.
- Add a Create World window after Create Character when starting an empty Saved
  Game. Reuse the Create Character window's size, placement, organization, and
  existing UI components.
- Show ten world attributes in alphabetical order, each using a 0-5 value and
  a 30-point total:
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
  The URL identity remains `world`, `level`, `slot`, `run`, and `seed`; world
  attributes are persisted generation parameters rather than URL identity
  fields.
- Drive floor generation from the committed world attributes. Their effects
  must include layout clarity, recovery placement, discoveries, reward rolls,
  exit placement, enemy strength and elite frequency, route accessibility,
  enemy population and aggression, pickup frequency and supply quantity, and
  hazard frequency.
- After each character level-up and the player's normal character allocation,
  automatically increase three distinct eligible world attributes by one point
  each. Present the world changes in the existing progression layout with the
  changed values highlighted green; the player cannot choose these values.
- Choose automatic world growth from level, campaign difficulty, recent world
  growth, and the level's deterministic seed so the result is impactful and
  naturally paced rather than always selecting the strongest benefit.
- Derive automatic world-growth choices from stable campaign identity and the
  player level, not mutable call-order randomness. Reloading, save timing, and
  XP-award order must not change the result for the same identity.
- Apply updated world attributes when generating the next floor. Do not
  retroactively regenerate the active floor when a level-up occurs.

## Capabilities

### New Capabilities

- `world-generation-attributes`: Defines player-facing world attributes,
  generation identity visibility, deterministic attribute-driven generation,
  and automatic world growth.

### Modified Capabilities

- `campaign-saves`: Persist world attributes and restore them with the complete
  campaign and deterministic run identity.
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
