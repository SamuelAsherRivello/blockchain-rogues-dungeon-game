# Design

## Context

The current campaign model already stores committed attributes, XP, level,
next threshold, and unspent Attribute Points. `ProgressionWindow` owns a React
draft allocation, while the procedural rules layer owns effective attribute and
resource calculations. The attribute panel already has separate label help
tooltips and arrow controls. See proposal.md for the motivation and scope.

## Goals / Non-Goals

**Goals:**

- Derive pending-benefit text from the same effective-attribute rules used by
  gameplay.
- Keep draft allocation pure until confirmation and keep the summary synchronized
  with the draft.
- Make level gain presentation visibly sequenced: convergence first, chime after.
- Preserve the current ten attributes, save shape, and existing progression
  event model.

**Non-Goals:**

- Defining gameplay effects for Strength or Stealth in this change.
- Replacing Perception with Vitality.
- Adding crafting, ore, item upgrades, or new equipment systems.

## Decisions

### Compute summary lines from committed-versus-preview effects

The Progression UI will compare committed attributes with the preview after all
draft points are applied, then format one line per attribute with a non-zero
pending allocation. This prevents repeated clicks from producing duplicate
lines and ensures decrementing a draft removes the line when the pending amount
returns to zero.

The formatter will use the existing gameplay rules:

- Health: percentage change in effective maximum Health, rounded for display.
- Stamina and Mana: projected maximum-capacity increase.
- Offense: projected weapon-damage increase, expressed as an upper-bound effect
  because Stamina readiness can reduce the live value.
- Defense: projected incoming-damage reduction, expressed as an upper-bound
  effect for the same readiness reason.
- Perception: detection-range increase using the existing two-cells-per-point
  rule.
- Luck: hit-chance increase plus loot-tier progress or a newly crossed loot
  tier when applicable.
- Recovery: additional Stamina restored per accepted move.
- Strength and Stealth: explicit `No gameplay effect yet.` placeholder.

The Progression window will be titled `Level Up — Character` and will show the
remaining allocation count above the attribute controls in the form `Spend N of
3 attribute points.`. Below the controls, an `Earned Results` heading will be
followed by a borderless results field that is always three lines tall. The
field will contain one body-text bullet per distinct affected attribute and
remain empty when no points are pending.

### Keep result and gameplay tooltips separate

Arrow tooltips will be generated from the preview value and will contain only
the direction, attribute label, and resulting value. Attribute-label tooltips
will continue to describe gameplay effects independently, including the
placeholder text for unimplemented attributes.

### Preserve pure allocation and persistence boundaries

The draft remains local to `ProgressionWindow`. Confirmation continues to send
one aggregate allocation action to the rules layer, where caps and available
points are validated. Summary text is presentation-only and must not alter
campaign state, resources, or time.

### Sequence the level-gain cue

The existing `xp.level.changed` event remains the authoritative trigger. The
game presentation layer will create the inward sparkle effects immediately,
track their completion, and invoke the level-gain audio cue only after the
converging effects finish. Multiple levels gained in one XP award retain one
celebration per gained level without blocking gameplay.

### Verification strategy

Pure formatter and progression tests will cover aggregate lines, percentage
calculation, threshold-aware Luck text, placeholders, caps, and draft
cancellation. A focused muted Playwright check is useful after implementation
to verify the dialog layout, arrow tooltip text, and level-up presentation;
broader browser coverage remains a finalization concern.

## Risks / Trade-offs

- [Gameplay formulas change independently of the summary formatter] -> Keep
  benefit derivation beside the existing pure effective-attribute helpers and
  cover representative values with focused tests.
- [Four or more affected attributes exceed the fixed three-line area] -> Keep
  the specified three-line presentation and accept normal content overflow
  rather than changing the requested layout.
- [A delayed chime is lost during rapid scene transitions] -> Tie the timer to
  the active session generation and clean it up with the existing presentation
  timers.
- [Unimplemented attributes appear misleading] -> Use explicit placeholder
  wording rather than implying a numerical gameplay benefit.

## Migration Plan

No campaign migration is required. The change retains the current attribute
names and progression fields. Rollback removes the presentation formatter,
summary UI, tooltip wording change, and delayed level-gain cue without changing
saved campaign data.
