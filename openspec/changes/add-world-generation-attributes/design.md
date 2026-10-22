# Design

## Context

See [proposal.md](proposal.md) for the user-facing motivation and scope. The
current application already has Create Character and Progression React
windows, a shared attribute-panel presentation, Babylon Lite minimap rendering,
campaign persistence, URL run identity, and seeded floor generation through
`worldFloorSeed(worldSeed, slot, run, level)`. The working tree also contains a
provisional Create World implementation that must be removed surgically before
the finalized flow is added.

## Goals / Non-Goals

**Goals:**

- Reuse the established creation and progression UI patterns instead of
  inventing a parallel interaction model.
- Keep world attributes as persisted campaign state and keep run identity
  visible and read-only during creation.
- Make every world effect deterministic for a stable campaign identity.
- Keep active floors stable when a player levels up and apply world growth to
  future generation.
- Preserve existing saves and unrelated working-tree changes.

**Non-Goals:**

- Adding URL query parameters for the ten world attributes.
- Letting the player manually choose automatic world growth at level-up.
- Regenerating an active floor after world growth.
- Replacing the existing character progression allocation or tooltip system.
- Adding a new renderer, runtime dependency, or alternate orientation.

## Decisions

### Use one world-generation attribute contract

Define one ordered world-attribute contract with the ten names, 0-5 bounds,
30-point creation budget, label tooltips, and generation effects. The
procedural rules layer owns the contract and pure calculations; React windows
consume it for display. This avoids drifting labels, help text, and generation
behavior between Create World and later progression.

Alternative considered: define labels in the Create World component and rules
separately in the generator. Rejected because the player-facing explanation
could become inaccurate as generation tuning changes.

### Keep URL identity separate from world attributes

The identity panel renders the same five values used by the URL run identity:
World, Level, Run, Slot, and Seed. World and level identify the current realm
and floor; slot and run identify the campaign run; seed identifies the
persistent world seed. The existing derived floor seed remains based on world
seed, slot, run, and level. World attributes are passed as deterministic
generation parameters and saved with the campaign rather than added to URL
arguments.

Alternative considered: serialize all ten attributes into the URL. Rejected
because it makes ordinary player URLs noisy and duplicates campaign state.

### Preview the same seeded generation path

Create World builds a preview campaign with the selected identity and current
draft world attributes, then renders it through the existing Babylon Lite
minimap path. A roll updates the draft and preview together. Confirmation
passes the same committed attributes into normal campaign creation, so the
preview and first active floor use the same generation contract.

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

Each knob consumes the level RNG derived from the stable floor identity. The
generator validates protected start, exit, and reachability cells after these
adjustments. A default neutral profile preserves existing generation behavior
for callers and legacy fixtures that do not provide world attributes.

Alternative considered: have one aggregate difficulty scalar replace the ten
attributes. Rejected because it hides the player's meaningful world choices
and prevents targeted generation tuning.

### Derive automatic world growth from a forked level-up seed

When character level `L` is confirmed, derive an independent deterministic
growth seed from the campaign world seed, slot, run, character level,
generator version, campaign difficulty, and a fixed growth-purpose tag. Rank
eligible attributes using that seed plus recent growth history, then increase
three distinct attributes by one point. Candidates at 5 are excluded. If fewer
than three candidates remain, spend only on eligible candidates.

The selector uses level and difficulty weights to avoid a repetitive or
max-benefit-only progression. Recent growth history prevents the same small
set of attributes from being selected every level. The result is computed from
identity and committed state, not from the order in which XP events arrived.

Alternative considered: consume the live gameplay RNG when the level-up event
fires. Rejected because save timing and XP-award ordering would change future
worlds and break deterministic replay.

### Sequence progression without changing character allocation semantics

Keep the existing local draft and confirmation boundary for character points.
After character confirmation succeeds, compute and commit the automatic world
growth as one related progression result. The Progression window renders the
world before/after values with green highlights, but does not expose controls
or allow cancellation of only the world portion. Closing before character
confirmation leaves both character and world state unchanged.

Alternative considered: give the world panel interactive arrows. Rejected
because the requested world progression is authored by the game, not chosen by
the player.

### Replace provisional implementation surgically

Before implementing the finalized flow, remove only the provisional Create
World import, state, callbacks, styles, types, and generation hooks that were
added for exploration. Do not revert `game.tsx`, `types.ts`, the procedural
system, or CSS wholesale because those files contain unrelated completed and
in-progress work.

## Risks / Trade-offs

- [Risk] Positive world attributes can make later floors too easy. -> Keep
  level and campaign difficulty scaling independent, use automatic growth
  weights that preserve threat, and validate representative difficulty bands.
- [Risk] Fortune and Plenty can overlap. -> Fortune owns reward quality,
  payout, and bonus chance; Plenty owns pickup occurrence and common-supply
  quantity.
- [Risk] Peace can become only an enemy-count reduction. -> Add deterministic
  enemy behavior traits such as awareness, aggression, and pursuit persistence
  to the generation contract and test them separately.
- [Risk] World attributes can invalidate a floor. -> Run existing protected-cell
  and reachability validation after attribute-driven placement and repair or
  reject invalid candidates deterministically.
- [Risk] Existing saves lack world attributes. -> Normalize missing fields to
  the neutral profile while preserving existing campaign state.
- [Risk] Shared files contain unrelated uncommitted changes. -> Use focused
  edits, inspect diffs by feature, and verify that only the planned world
  changes are included.

## Migration Plan

1. Remove the provisional Create World implementation without changing legacy
   campaign behavior.
2. Add the world-attribute contract, neutral defaults, save normalization, and
   deterministic generator inputs.
3. Add Create World by composing Create Character components and the existing
   Babylon Lite minimap path.
4. Add automatic world progression after confirmed character allocations and
   apply it to future floor generation.
5. Run focused pure generation, persistence, and progression tests, then one
   muted Playwright check for creation, identity visibility, reroll preview,
   and green automatic growth presentation.
6. Preserve old saves by treating missing world attributes as neutral values.

Rollback removes the Create World and automatic growth presentation while
leaving the neutralized save field compatible. Existing floor snapshots and
legacy campaigns remain loadable.
