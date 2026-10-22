# Proposal

## Why

Rogue's Dungeon already awards XP and grants Attribute Points, but the
Progression window does not yet make the pending gameplay result clear. The
player should be able to understand the practical benefit of a draft allocation
without interpreting raw stat deltas or guessing how multiple points combine.

## What Changes

- Keep the current ten-attribute model, including Perception.
- Preserve XP awards, level thresholds, three points per level, and deferred
  allocation as the progression model.
- Keep Strength and Stealth visible, allocatable, and tooltip-enabled even
  though their gameplay effects remain unimplemented for now.
- Show the remaining allocation count as `Spend N of 3 Attribute Points.`
  above the attribute list.
- Use lowercase `attribute points` in the allocation count and level-up
  callout.
- Title the Progression window `Level Up — Character`.
- Add an `Earned Results` heading and results field below the attribute list.
- Populate the results field with one body-text bullet per affected attribute,
  combining all pending points for one attribute into one total
  gameplay-effect line; keep the field empty when no points are pending.
- Keep the results field borderless and three lines tall at all times.
- Show Health's pending benefit as the projected percentage increase in maximum
  Health; show the other implemented attributes using plain-language gameplay
  effects.
- Use an explicit placeholder such as `No gameplay effect yet.` for pending
  Strength or Stealth points.
- Change arrow hover text to show only the resulting attribute value, such as
  `Increase Perception to 5.` or `Decrease Perception to 4.`; remove raw
  parenthesized deltas.
- Preserve level-up celebration with inward-moving sparkles followed by the
  level-gain chime.
- Do not add crafting, ore, item upgrades, recipes, or item-combination flows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `character-progression`: define the pending gameplay-benefit summary,
  aggregate allocation wording, and placeholder behavior for unimplemented
  attributes while retaining XP and level-up progression.
- `tooltip-presentation`: remove raw point deltas from attribute adjustment
  tooltips while retaining the resulting-value wording.

## Impact

The change affects the Progression React window and attribute panel, the pure
attribute-effect calculations used to derive summary text, and focused tests
for XP progression, allocation previews, tooltip wording, and the level-gain
presentation. Existing campaign saves remain compatible because the attribute
set and progression state shape are retained. Playwright can provide useful
evidence for the browser-visible Progression dialog and tooltip behavior; the
proposal does not run browser verification.
